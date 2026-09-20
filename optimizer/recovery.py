"""Plan validation and time-aware stability-first disruption recovery."""
from copy import deepcopy
from dataclasses import replace
from datetime import timedelta
from time import perf_counter
try:
    from .optimizer import optimize_schedule, validate_solution, calculate_metrics
    from .candidate_windows import generate_footprint_windows, OperationalAllowances
    from .capacity import normalize_tasks
    from .feasibility import evaluate_task_in_window, task_requirements
    from .resources import PowerWindow, validate_capacities
    from .time_utils import parse_datetime, datetime_to_minutes
    from .recovery_validation import validate_complete_plan
    from .recovery_graph import build_recovery_graph
except ImportError:
    from optimizer import optimize_schedule, validate_solution, calculate_metrics
    from candidate_windows import generate_footprint_windows, OperationalAllowances
    from capacity import normalize_tasks
    from feasibility import evaluate_task_in_window, task_requirements
    from resources import PowerWindow, validate_capacities
    from time_utils import parse_datetime, datetime_to_minutes
    from recovery_validation import validate_complete_plan
    from recovery_graph import build_recovery_graph


class RecoveryValidationError(ValueError):
    def __init__(self, report):
        self.report = report
        super().__init__(f"RECOVERY_VALIDATION_FAILED: {report.as_dict()}")


def _bounded_interval(disruption, start, end):
    if not disruption.get("start_time") or not disruption.get("end_time"):
        raise ValueError("Bounded disruption requires start_time and end_time")
    left, right = parse_datetime(disruption["start_time"]), parse_datetime(disruption["end_time"])
    if left >= right:
        raise ValueError("Disruption start_time must precede end_time")
    effective = parse_datetime(disruption.get("effective_time") or start)
    return max(left, effective), min(right, parse_datetime(end))


def _union_windows(windows):
    merged = []
    for left, right in sorted((parse_datetime(w.start_time), parse_datetime(w.end_time))
                              for w in windows):
        if merged and left <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(right, merged[-1][1]))
        else:
            merged.append((left, right))
    return tuple(PowerWindow(left.isoformat(), right.isoformat()) for left, right in merged)


def _subtract_window(windows, removed_start, removed_end):
    remaining = []
    for window in windows:
        left, right = parse_datetime(window.start_time), parse_datetime(window.end_time)
        if right <= removed_start or left >= removed_end:
            remaining.append(window)
            continue
        if left < removed_start:
            remaining.append(PowerWindow(left.isoformat(), removed_start.isoformat()))
        if removed_end < right:
            remaining.append(PowerWindow(removed_end.isoformat(), right.isoformat()))
    return tuple(remaining)


def _validate_execution_snapshot(blocks, as_of):
    cutoff = parse_datetime(as_of)
    for block in blocks:
        status = block.get("status", "PLANNED")
        actual_start, actual_end = block.get("actual_start_time"), block.get("actual_end_time")
        if status == "IN_PROGRESS":
            remaining = block.get("remaining_minutes_by_task")
            handback = block.get("remaining_handback_minutes")
            if (not actual_start or actual_end or not isinstance(remaining, dict)
                    or set(remaining) != set(block["tasks"])
                    or any(type(value) is not int or value < 0 for value in remaining.values())
                    or type(handback) is not int or handback < 0
                    or not any(remaining.values()) and not handback):
                raise ValueError("INVALID_EXECUTION_SNAPSHOT: active possession requires actual start and explicit residual work")
            if parse_datetime(actual_start) > cutoff:
                raise ValueError("INVALID_EXECUTION_SNAPSHOT: actual start is after as_of")
        elif status == "COMPLETED":
            if not actual_start or not actual_end:
                raise ValueError("INVALID_EXECUTION_SNAPSHOT: completed possession requires actual start and end")
            if not parse_datetime(actual_start) < parse_datetime(actual_end) <= cutoff:
                raise ValueError("INVALID_EXECUTION_SNAPSHOT: completed timestamps are outside history")
        elif actual_start or actual_end:
            raise ValueError("INVALID_EXECUTION_SNAPSHOT: unstarted possession has actual timestamps")
        elif status not in {"CANCELLED", "COMPLETED", "IN_PROGRESS"} and parse_datetime(block["start_time"]) < cutoff:
            raise ValueError("INVALID_EXECUTION_SNAPSHOT: unstarted possession begins before as_of")


def _active_reservations(blocks, normalized_tasks, as_of, origin, horizon_end):
    by_task = {task["task_id"]: task for task in normalized_tasks}
    fixed = {"infrastructure": {}, "crew_type": {}, "machine_type": {}}
    cutoff = datetime_to_minutes(as_of, origin)
    horizon = datetime_to_minutes(horizon_end, origin)
    for block in blocks:
        if block.get("status") != "IN_PROGRESS":
            continue
        remaining = block["remaining_minutes_by_task"]
        duration = max(block["remaining_handback_minutes"], *remaining.values())
        if cutoff + duration > horizon:
            raise ValueError("EXECUTION_CONFLICT: active residual exceeds the planning horizon")
        first = by_task[block["tasks"][0]]
        for resource in first["_capacity_resource_ids"]:
            fixed["infrastructure"].setdefault(resource, []).append((cutoff, cutoff + duration))
        for task_id in block["tasks"]:
            task = by_task[task_id]
            work_end = cutoff + remaining[task_id]
            for field in ("crew_type", "machine_type"):
                pool = task.get(field)
                if pool and work_end > cutoff:
                    fixed[field].setdefault(pool, []).append((cutoff, work_end))
    return fixed


def apply_train_delay(data, train_id, delay_minutes, effective_time=None):
    if isinstance(delay_minutes, bool) or not isinstance(delay_minutes, int) or not 0 <= delay_minutes <= 1440:
        raise ValueError("delay_minutes must be an integer between 0 and 1440")
    changed = deepcopy(data)
    affected = [r for r in changed["train_occupancy"] if r["train_id"] == train_id]
    if not affected:
        raise ValueError(f"Unknown train ID: {train_id}")
    cutoff = parse_datetime(effective_time) if effective_time else None
    for row in affected:
        entry, exit_time = parse_datetime(row["entry_time"]), parse_datetime(row["exit_time"])
        if cutoff is not None and exit_time <= cutoff:
            continue
        if cutoff is None or entry >= cutoff:
            row["entry_time"] = (entry + timedelta(minutes=delay_minutes)).isoformat()
        row["exit_time"] = (exit_time + timedelta(minutes=delay_minutes)).isoformat()
    ordered = sorted(affected, key=lambda row: parse_datetime(row["entry_time"]))
    if any(parse_datetime(after["entry_time"]) < parse_datetime(before["exit_time"])
           for before, after in zip(ordered, ordered[1:])):
        raise ValueError("Delayed train trajectory has overlapping consecutive segments")
    return changed


def validate_current_plan(data, blocks, start, end, resources=None, allowances=OperationalAllowances()):
    ids = [b["block_id"] for b in blocks]
    if len(ids) != len(set(ids)):
        raise ValueError("Current plan has duplicate block IDs")
    tasks = data["maintenance_tasks"]
    sections = data.get("sections", [])
    normalized = normalize_tasks(tasks, sections)
    validate_solution(blocks, normalized, data["train_occupancy"], start, end, allowances=allowances, sections=sections)
    windows = generate_footprint_windows(
        data["train_occupancy"],
        ({"section_id": t["section_id"], "section_ids": t["_section_ids"], "capacity_resource_ids": t["_capacity_resource_ids"]} for t in normalized),
        sections, start, end, allowances,
    )
    by_id = {t["task_id"]:t for t in normalized}
    reservations = []
    for block in blocks:
        for task_id in block["tasks"]:
            task = by_id[task_id]
            if not any(evaluate_task_in_window(task, window, allowances=allowances,
                reservation_start=block["start_time"], resource_context=resources).feasible
                for window in windows if window.footprint_id == task["_footprint_id"]):
                raise ValueError(f"Current plan reservation fails hard feasibility: {task_id}")
            minutes = datetime_to_minutes(block["start_time"], start)
            reservations.append((task, minutes, minutes+task_requirements(task, allowances).required_minutes))
    validate_capacities(reservations, resources, origin=start)


def plan_changes(before, after):
    def key(block):
        return (block["section_id"], tuple(sorted(block["tasks"])))
    old = {key(b):b for b in before}
    new = {key(b):b for b in after}
    block_changes = []
    for signature in sorted(old.keys() | new.keys()):
        a, b = old.get(signature), new.get(signature)
        shift = abs(datetime_to_minutes(b["start_time"], a["start_time"])) if a and b else None
        state = "NEW" if a is None else "DEFERRED" if b is None else "RETAINED" if shift == 0 and datetime_to_minutes(b["end_time"], a["end_time"]) == 0 else "SHIFTED"
        block_changes.append(dict(state=state, section_id=signature[0], task_ids=list(signature[1]),
                                  before_block_id=a["block_id"] if a else None,
                                  after_block_id=b["block_id"] if b else None, shift_minutes=shift))
    old_tasks = {t:b for b in before for t in b["tasks"]}
    new_tasks = {t:b for b in after for t in b["tasks"]}
    task_changes = []
    for task_id in sorted(old_tasks.keys() | new_tasks.keys()):
        a, b = old_tasks.get(task_id), new_tasks.get(task_id)
        shift = abs(datetime_to_minutes(b["start_time"],a["start_time"])) if a and b else None
        state = "NEW" if a is None else "UNSCHEDULED" if b is None else "RETAINED" if shift == 0 else "SHIFTED"
        task_changes.append(dict(task_id=task_id, state=state, shift_minutes=shift,
                                 regrouped=bool(a and b and key(a) != key(b))))
    metrics = {f"{name.lower()}_blocks":sum(c["state"] == name for c in block_changes) for name in ("RETAINED","SHIFTED","CANCELLED","NEW")}
    metrics["deferred_blocks"] = sum(c["state"] == "DEFERRED" for c in block_changes)
    metrics.update({f"{name.lower()}_tasks":sum(c["state"] == name for c in task_changes) for name in ("RETAINED","SHIFTED","NEW")})
    metrics["total_shift_minutes"] = sum(c["shift_minutes"] or 0 for c in task_changes)
    metrics["total_block_shift_minutes"] = sum(c["shift_minutes"] or 0 for c in block_changes)
    return dict(metrics=metrics, block_changes=block_changes, task_changes=task_changes,
                newly_unscheduled_task_ids=sorted(old_tasks.keys()-new_tasks.keys()))


def apply_disruption(data, resource_context, disruption, start, end):
    """Apply one validated scenario to a copy; return inputs and affected sections."""
    changed = deepcopy(data)
    event_id = disruption.get("event_id")
    if event_id and event_id in changed.get("_applied_event_ids", []):
        return changed, resource_context, []
    context = resource_context
    kind = disruption.get("type")
    effective = disruption.get("effective_time") or start
    affected_sections = set()
    if kind in {"TRAIN_DELAY", "TRAIN_DELAYS"}:
        delays = [disruption] if kind == "TRAIN_DELAY" else disruption.get("delays", [])
        if not delays:
            raise ValueError("TRAIN_DELAYS requires at least one delay.")
        for item in delays:
            original = changed
            changed = apply_train_delay(
                original, item["train_id"], item["delay_minutes"], effective
            )
            affected_sections.update(
                row["section_id"] for row in original["train_occupancy"]
                if row["train_id"] == item["train_id"]
            )
    elif kind == "CREW_UNAVAILABLE":
        if context is None or disruption["crew_type"] not in context.crew_capacities:
            raise ValueError(f"Unknown crew pool: {disruption['crew_type']}")
        left, right = _bounded_interval(disruption, start, end)
        if left < right:
            outages = dict(context.crew_outages)
            pool = disruption["crew_type"]
            outages[pool] = _union_windows((*outages.get(pool, ()), PowerWindow(left.isoformat(), right.isoformat())))
            context = replace(context, crew_outages=outages)
    elif kind == "MACHINE_UNAVAILABLE":
        if context is None or disruption["machine_type"] not in context.machine_capacities:
            raise ValueError(f"Unknown machine pool: {disruption['machine_type']}")
        left, right = _bounded_interval(disruption, start, end)
        if left < right:
            outages = dict(context.machine_outages)
            pool = disruption["machine_type"]
            outages[pool] = _union_windows((*outages.get(pool, ()), PowerWindow(left.isoformat(), right.isoformat())))
            context = replace(context, machine_outages=outages)
    elif kind == "POWER_ISOLATION_CANCELLED":
        section_ids = disruption["section_ids"]
        if context is None or any(item not in context.power_windows for item in section_ids):
            raise ValueError("Power cancellation references an unknown section.")
        left, right = _bounded_interval(disruption, start, end)
        power = dict(context.power_windows)
        for section_id in section_ids:
            if left < right:
                power[section_id] = _subtract_window(power[section_id], left, right)
        context = replace(context, power_windows=power)
        affected_sections.update(section_ids)
    elif kind == "SECTION_UNAVAILABLE":
        section_id = disruption["section_id"]
        if section_id not in {row["section_id"] for row in changed.get("sections", [])}:
            raise ValueError(f"Unknown section ID: {section_id}")
        row = {
            "train_id": f"SECTION_CLOSURE_{section_id}",
            "section_id": section_id,
            "entry_time": disruption.get("start_time", effective),
            "exit_time": disruption.get("end_time", end),
            "traffic_type": "SYNTHETIC_DISRUPTION",
        }
        if disruption.get("capacity_resource_ids"):
            row["capacity_resource_ids"] = disruption["capacity_resource_ids"]
        changed["train_occupancy"].append(row)
        affected_sections.add(section_id)
    elif kind == "EMERGENCY_WORK":
        task = deepcopy(disruption["task"])
        if task["task_id"] in {row["task_id"] for row in changed["maintenance_tasks"]}:
            raise ValueError(f"Duplicate emergency task ID: {task['task_id']}")
        changed["maintenance_tasks"].append(task)
        affected_sections.update(task.get("section_ids") or [task["section_id"]])
    elif kind == "WEATHER_RESTRICTION":
        delay = disruption["delay_minutes"]
        train_ids = disruption.get("train_ids") or sorted({r["train_id"] for r in changed["train_occupancy"]})
        for train_id in train_ids:
            original = changed
            changed = apply_train_delay(changed, train_id, delay, effective)
            affected_sections.update(r["section_id"] for r in original["train_occupancy"] if r["train_id"] == train_id)
    else:
        raise ValueError(f"Unsupported disruption type: {kind}")
    if event_id:
        changed["_applied_event_ids"] = [*changed.get("_applied_event_ids", []), event_id]
    return changed, context, sorted(affected_sections)


def recover_schedule(data, current_blocks, disruption, start, end, *, resource_context=None,
                     allowances=OperationalAllowances(), time_limit_seconds=None, risk_penalties=None,
                     snapshot_as_of=None, mutable_block_ids=None):
    recovery_started = perf_counter()
    as_of = snapshot_as_of or disruption.get("effective_time") or start
    _validate_execution_snapshot(current_blocks, as_of)
    validate_current_plan(data, current_blocks, start, end, resource_context, allowances)
    changed, changed_resources, affected_sections = apply_disruption(
        data, resource_context, disruption, start, end
    )
    normalized = normalize_tasks(changed["maintenance_tasks"], changed.get("sections", []))
    immutable = [block for block in current_blocks
                 if block.get("status") in {"COMPLETED", "IN_PROGRESS"}]
    immutable_ids = {task_id for block in immutable for task_id in block["tasks"]}
    fixed_reservations = _active_reservations(immutable, normalized, as_of, start, end)
    if immutable:
        history_report = validate_complete_plan(
            changed, immutable, start, end, resources=changed_resources,
            allowances=allowances, snapshot_as_of=as_of,
        )
        active_ids = {block["block_id"] for block in immutable
                      if block.get("status") == "IN_PROGRESS"}
        conflicts = [violation for violation in history_report.violations
                     if violation.block_id in active_ids or (
                         set(violation.involved_tasks) & immutable_ids and
                         violation.code in {"CREW_CAPACITY_EXCEEDED", "MACHINE_CAPACITY_EXCEEDED",
                                            "INFRASTRUCTURE_CAPACITY_EXCEEDED"})]
        if conflicts:
            raise ValueError(f"EXECUTION_CONFLICT: {[vars(item) for item in conflicts]}")
    work_data = dict(changed, maintenance_tasks=[task for task in changed["maintenance_tasks"]
                                                if task["task_id"] not in immutable_ids])
    future_blocks = [block for block in current_blocks if block not in immutable]
    mutable = set(mutable_block_ids) if mutable_block_ids is not None else None
    known_future_ids = {block["block_id"] for block in future_blocks}
    if mutable is not None and not mutable <= known_future_ids:
        raise ValueError("INVALID_INPUT: mutable scope includes unknown or immutable possession")
    fixed_complement = {block["block_id"] for block in future_blocks
                        if mutable is not None and block["block_id"] not in mutable}
    fixed_task_starts = {task_id: block["start_time"] for block in future_blocks
                         if block.get("locked") or block.get("status") == "FROZEN"
                         or block["block_id"] in fixed_complement
                         for task_id in block["tasks"]}
    original_task_ids = {task["task_id"] for task in data["maintenance_tasks"]}
    originally_scheduled = {task_id for block in current_blocks for task_id in block["tasks"]}
    fixed_absent = (original_task_ids - originally_scheduled if mutable is not None else set())
    invalidated = []
    for block in future_blocks:
        try:
            validate_current_plan(changed, [block], start, end, changed_resources, allowances)
        except ValueError as error:
            invalidated.append(dict(block_id=block["block_id"], task_ids=block["tasks"],
                                    reason_code="DISRUPTED_TRAIN_PROTECTION", detail=str(error)))
    facts = {}
    facts["snapshot_preparation_seconds"] = perf_counter() - recovery_started
    plan = optimize_schedule(work_data, start, end, resource_context=changed_resources,
                             allowances=allowances, time_limit_seconds=time_limit_seconds,
                             previous_blocks=future_blocks, fixed_task_starts=fixed_task_starts,
                             fixed_absent_task_ids=fixed_absent,
                             risk_penalties=risk_penalties, diagnostics=facts,
                             snapshot_as_of=as_of, fixed_reservations=fixed_reservations,
                             preserve_membership=True)
    if plan["status"] != "success":
        raise RuntimeError(f"Recovery has no usable incumbent: {plan['status']}")
    merge_started = perf_counter()
    plan["blocks"] = sorted([*deepcopy(immutable), *plan["blocks"]],
                            key=lambda block: (block["start_time"], block["block_id"]))
    facts["merge_seconds"] = perf_counter() - merge_started
    validation_started = perf_counter()
    report = validate_complete_plan(
        changed, plan["blocks"], start, end, resources=changed_resources,
        allowances=allowances, snapshot_as_of=as_of, parent_blocks=current_blocks,
        fixed_block_ids=fixed_complement,
        unscheduled_task_ids=plan["unscheduled_tasks"],
    )
    facts["complete_validation"] = report.as_dict()
    facts["recovery_validation_seconds"] = perf_counter() - validation_started
    if not report.valid:
        codes = {violation.code for violation in report.violations}
        active_block_ids = {block["block_id"] for block in immutable
                            if block.get("status") == "IN_PROGRESS"}
        execution_violation = any(violation.block_id in active_block_ids
                                  for violation in report.violations)
        prefix = "EXECUTION_CONFLICT" if execution_violation or codes & {
            "ACTIVE_EXECUTION_CHANGED", "COMPLETED_HISTORY_CHANGED",
        } else "RECOVERY_VALIDATION_FAILED"
        if prefix == "EXECUTION_CONFLICT":
            raise ValueError(f"{prefix}: {report.as_dict()}")
        raise RecoveryValidationError(report)
    plan["metrics"] = calculate_metrics(normalized, plan["blocks"], changed["train_occupancy"])
    service = facts["service_metrics"]
    service["scheduled_tasks"] = sorted(set(service["scheduled_tasks"]) | immutable_ids)
    service["scheduled_task_count"] += len(immutable_ids)
    service["unscheduled_tasks"] = plan["unscheduled_tasks"]
    service["block_count"] += len(immutable)
    service["integrated_blocks"] += sum(bool(block["integrated"]) for block in immutable)
    for task in normalized:
        if task["task_id"] in immutable_ids:
            service["productive_minutes"] += task["duration_minutes"]
            for field in ("criticality", "urgency", "overdue_days"):
                service[f"{field}_served"] += task.get(field, 0)
    service["possession_minutes"] += sum(datetime_to_minutes(block["end_time"], block["start_time"])
                                         for block in immutable)
    service["maintenance_delivery_efficiency"] = (
        service["productive_minutes"] / service["possession_minutes"]
        if service["possession_minutes"] else None
    )
    facts["recovery_total_seconds"] = perf_counter() - recovery_started
    changes = plan_changes(current_blocks, plan["blocks"])
    changes["metrics"]["unscheduled_tasks_after_disruption"] = len(plan["unscheduled_tasks"])
    return dict(plan=plan, diagnostics=facts, changes=changes, invalidated_blocks=invalidated,
                train_occupancy=changed["train_occupancy"],
                maintenance_tasks=changed["maintenance_tasks"],
                resource_context=changed_resources,
                affected_sections=affected_sections,
                immutable_task_ids=sorted(immutable_ids | set(fixed_task_starts)),
                escalation_required=any(item["block_id"] in {
                    block["block_id"] for block in future_blocks
                    if any(task in fixed_task_starts for task in block["tasks"])
                } for item in invalidated))


def recover_with_escalation(data, current_blocks, disruption, start, end, *,
                            resource_context=None, allowances=OperationalAllowances(),
                            time_limit_seconds=None, risk_penalties=None,
                            snapshot_as_of=None, minimum_tier="LOCAL"):
    """Try bounded scopes and return the first validated service-floor repair."""
    if minimum_tier not in {"LOCAL", "EXPANDED", "FULL_TERRITORY"}:
        raise ValueError("INVALID_INPUT: unknown minimum recovery tier")
    scope_started = perf_counter()
    as_of = snapshot_as_of or disruption.get("effective_time") or start
    _validate_execution_snapshot(current_blocks, as_of)
    validate_current_plan(data, current_blocks, start, end, resource_context, allowances)
    changed, changed_resources, _ = apply_disruption(data, resource_context, disruption, start, end)
    future = [block for block in current_blocks
              if block.get("status") not in {"COMPLETED", "IN_PROGRESS", "CANCELLED"}]
    future_ids = {block["block_id"] for block in future}
    seed = set()
    for block in future:
        try:
            validate_current_plan(changed, [block], start, end, changed_resources, allowances)
        except ValueError:
            seed.add(block["block_id"])
    graph = build_recovery_graph(changed, future, start, end, resources=changed_resources,
                                 allowances=allowances, snapshot_as_of=as_of)
    scope_seconds = perf_counter() - scope_started
    scopes = (
        ("LOCAL", graph.expand(seed, 1)),
        ("EXPANDED", graph.expand(seed, 2)),
        ("FULL_TERRITORY", future_ids),
    )
    required_floor = {task["task_id"] for task in changed["maintenance_tasks"]
                      if task.get("required") is True}
    attempts = []
    seen_scopes = set()
    deadline = perf_counter() + time_limit_seconds if time_limit_seconds is not None else None
    enabled = False
    for tier, scope in scopes:
        enabled = enabled or tier == minimum_tier
        if not enabled:
            continue
        scope_key = frozenset(scope)
        if scope_key in seen_scopes:
            continue
        seen_scopes.add(scope_key)
        remaining = None if deadline is None else deadline - perf_counter()
        if remaining is not None and remaining <= 0:
            attempts.append(dict(tier=tier, mutable_block_ids=sorted(scope),
                                 status="NO_INCUMBENT", reason="TOTAL_TIME_BUDGET"))
            break
        try:
            result = recover_schedule(
                data, current_blocks, disruption, start, end,
                resource_context=resource_context, allowances=allowances,
                time_limit_seconds=remaining, risk_penalties=risk_penalties,
                snapshot_as_of=as_of,
                mutable_block_ids=None if tier == "FULL_TERRITORY" else scope,
            )
        except RecoveryValidationError as error:
            recoverable = {"WINDOW_UNAVAILABLE", "TRAIN_PROTECTION_CONFLICT",
                           "CREW_CAPACITY_EXCEEDED", "MACHINE_CAPACITY_EXCEEDED",
                           "INFRASTRUCTURE_CAPACITY_EXCEEDED", "POWER_WINDOW_UNAVAILABLE",
                           "DEADLINE_VIOLATION", "CREW_UNAVAILABLE", "MACHINE_UNAVAILABLE"}
            codes = {violation.code for violation in error.report.violations}
            if not codes <= recoverable:
                raise
            attempts.append(dict(tier=tier, mutable_block_ids=sorted(scope),
                                 status="VALIDATION_FEASIBILITY_FAILURE",
                                 validation=error.report.as_dict()))
            continue
        except RuntimeError as error:
            marker = "Recovery has no usable incumbent: "
            if not str(error).startswith(marker):
                raise
            solver_status = str(error)[len(marker):]
            if solver_status == "model_invalid":
                raise ValueError("MODEL_INVALID: recovery model failed validation") from error
            status = "INFEASIBLE" if solver_status == "infeasible" else "NO_INCUMBENT"
            attempts.append(dict(tier=tier, mutable_block_ids=sorted(scope),
                                 status=status, solver_status=solver_status))
            continue
        missing = sorted(required_floor - {task_id for block in result["plan"]["blocks"]
                                           for task_id in block["tasks"]})
        if missing:
            attempts.append(dict(tier=tier, mutable_block_ids=sorted(scope),
                                 status="SERVICE_FLOOR_FAILED", missing_task_ids=missing))
            continue
        attempts.append(dict(tier=tier, mutable_block_ids=sorted(scope),
                             status="VALIDATED", validation=result["diagnostics"]["complete_validation"]))
        result.update(status="success", tier=tier, seed_block_ids=sorted(seed),
                      attempts=attempts)
        result["diagnostics"]["scope_seconds"] = scope_seconds
        return result
    final_status = ("INFEASIBLE" if attempts and attempts[-1]["tier"] == "FULL_TERRITORY"
                    and attempts[-1]["status"] == "INFEASIBLE" else
                    "NO_INCUMBENT" if attempts and attempts[-1]["status"] == "NO_INCUMBENT"
                    else "NO_VALIDATED_PROPOSAL")
    return dict(status=final_status, tier=None, plan=None,
                validation_status="NOT_RUN_NO_CANDIDATE",
                seed_block_ids=sorted(seed), attempts=attempts)
