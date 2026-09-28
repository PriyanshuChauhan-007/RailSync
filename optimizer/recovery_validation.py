"""Independent, structured validation of complete planning and recovery results.

This module reads plan records and input facts. It does not inspect CP-SAT
variables or accept solver status as evidence of plan validity.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from itertools import combinations
from typing import Any, Iterable, Mapping

try:
    from .candidate_windows import OperationalAllowances, generate_footprint_windows
    from .capacity import movement_capacity_resources, normalize_tasks, section_index
    from .compatibility import CompatibilityPolicy, evaluate_compatibility
    from .feasibility import task_requirements
    from .resources import ResourceContext
    from .time_utils import parse_datetime
except ImportError:  # Keep direct optimizer-module imports used by legacy tests.
    from candidate_windows import OperationalAllowances, generate_footprint_windows
    from capacity import movement_capacity_resources, normalize_tasks, section_index
    from compatibility import CompatibilityPolicy, evaluate_compatibility
    from feasibility import task_requirements
    from resources import ResourceContext
    from time_utils import parse_datetime


@dataclass(frozen=True)
class ValidationViolation:
    code: str
    detail: str
    resource_id: str | None = None
    interval: tuple[str, str] | None = None
    involved_tasks: tuple[str, ...] = ()
    block_id: str | None = None


@dataclass(frozen=True)
class ValidationReport:
    violations: tuple[ValidationViolation, ...]

    @property
    def valid(self) -> bool:
        return not self.violations

    def as_dict(self) -> dict[str, Any]:
        return {"valid": self.valid, "violations": [vars(item) for item in self.violations]}


def _overlap(a_start, a_end, b_start, b_end) -> bool:
    return a_start < b_end and b_start < a_end


def _signature(block: Mapping[str, Any]) -> tuple[Any, ...]:
    """Fields that a restricted solve and execution history may not rewrite."""
    return (
        block.get("block_id"), tuple(sorted(block.get("tasks", ()))),
        block.get("section_id"), block.get("start_time"), block.get("end_time"),
        tuple(block.get("section_ids") or ()),
        tuple(block.get("capacity_resource_ids") or ()),
        tuple(block.get("track_ids") or ()),
        block.get("power_isolation_zone_id"), block.get("status"),
        block.get("locked", False), block.get("actual_start_time"),
        block.get("actual_end_time"),
        tuple(sorted((block.get("remaining_minutes_by_task") or {}).items())),
        block.get("remaining_handback_minutes"),
    )


def _contained(start, end, windows: Iterable[Any]) -> bool:
    intervals = sorted((parse_datetime(w.start_time), parse_datetime(w.end_time)) for w in windows)
    merged: list[tuple[Any, Any]] = []
    for left, right in intervals:
        if merged and left <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(right, merged[-1][1]))
        else:
            merged.append((left, right))
    return any(left <= start and end <= right for left, right in merged)


def _capacity_violations(
    reservations: list[tuple[str, Any, Any, tuple[str, ...], str]],
    capacities: Mapping[str, int],
    code: str,
) -> list[ValidationViolation]:
    violations = []
    for resource_id, capacity in capacities.items():
        events = []
        for index, (pool, start, end, tasks, block_id) in enumerate(reservations):
            if pool == resource_id and start < end:
                events.extend(((start, 1, tasks, index), (end, -1, tasks, index)))
        active: dict[int, tuple[str, ...]] = {}
        for instant, change, tasks, index in sorted(events, key=lambda e: (e[0], e[1])):
            if change < 0:
                active.pop(index, None)
            else:
                active[index] = tasks
                if len(active) > capacity:
                    violations.append(ValidationViolation(
                        code, f"{resource_id} uses {len(active)} units; capacity is {capacity}",
                        resource_id=resource_id,
                        interval=(instant.isoformat(), min(
                            reservations[active_index][2] for active_index in active
                        ).isoformat()),
                        involved_tasks=tuple(sorted({task for group in active.values() for task in group})),
                    ))
                    break
    return violations


def validate_complete_plan(
    data: Mapping[str, Any],
    blocks: list[dict[str, Any]],
    horizon_start: str,
    horizon_end: str,
    *,
    resources: ResourceContext | None = None,
    allowances: OperationalAllowances = OperationalAllowances(),
    snapshot_as_of: str | None = None,
    parent_blocks: list[dict[str, Any]] | None = None,
    fixed_block_ids: Iterable[str] = (),
    required_task_ids: Iterable[str] = (),
    unscheduled_task_ids: Iterable[str] | None = None,
    plan_identity: Mapping[str, Any] | None = None,
    expected_plan_identity: Mapping[str, Any] | None = None,
) -> ValidationReport:
    """Validate a full plan with input-derived rules and structured reasons."""
    violations: list[ValidationViolation] = []

    def reject(code, detail, *, resource_id=None, interval=None, tasks=(), block_id=None):
        violations.append(ValidationViolation(code, detail, resource_id, interval,
                                               tuple(tasks), block_id))

    origin, horizon_end_dt = parse_datetime(horizon_start), parse_datetime(horizon_end)
    cutoff = parse_datetime(snapshot_as_of) if snapshot_as_of else None
    sections = list(data.get("sections") or [])
    by_section = section_index(sections)
    tasks = normalize_tasks(data.get("maintenance_tasks", []), sections)
    by_task = {task["task_id"]: task for task in tasks}
    if len(by_task) != len(tasks):
        reject("DUPLICATE_TASK_ID", "Input contains duplicate task IDs")
    parent_by_id = {block["block_id"]: block for block in parent_blocks or []}
    by_block_id = {block.get("block_id"): block for block in blocks}
    seen_tasks: set[str] = set()
    seen_blocks: set[str] = set()
    infra: list[tuple[str, Any, Any, tuple[str, ...], str]] = []
    crew: list[tuple[str, Any, Any, tuple[str, ...], str]] = []
    machine: list[tuple[str, Any, Any, tuple[str, ...], str]] = []

    if expected_plan_identity is not None and plan_identity != expected_plan_identity:
        reject("STALE_PLAN", "Plan/world version does not match the validation binding")

    footprints = [dict(
        section_id=task["section_id"],
        section_ids=task["_section_ids"],
        capacity_resource_ids=task["_capacity_resource_ids"],
    ) for task in tasks]
    windows = generate_footprint_windows(
        list(data.get("train_occupancy", [])), footprints, sections,
        origin, horizon_end_dt, allowances
    )
    for block in blocks:
        block_id = block.get("block_id")
        member_ids = block.get("tasks") or []
        if not isinstance(block_id, str) or not block_id or block_id in seen_blocks:
            reject("POSSESSION_ID_INVALID", "Missing or duplicate possession ID", block_id=block_id)
        seen_blocks.add(block_id)
        if not member_ids or len(member_ids) != len(set(member_ids)):
            reject("POSSESSION_MEMBERSHIP_INVALID", "Empty or duplicate possession membership",
                   tasks=member_ids, block_id=block_id)
            continue
        missing = set(member_ids) - set(by_task)
        duplicates = set(member_ids) & seen_tasks
        if missing or duplicates:
            reject("TASK_ACCOUNTING_INVALID", f"Unknown {sorted(missing)} or duplicate {sorted(duplicates)} tasks",
                   tasks=member_ids, block_id=block_id)
            continue
        seen_tasks.update(member_ids)
        members = [by_task[task_id] for task_id in member_ids]
        try:
            start, end = parse_datetime(block["start_time"]), parse_datetime(block["end_time"])
        except (KeyError, TypeError, ValueError) as error:
            reject("INVALID_TIMESTAMP", str(error), tasks=member_ids, block_id=block_id)
            continue
        if not origin <= start < end <= horizon_end_dt:
            reject("WINDOW_UNAVAILABLE", "Possession lies outside the planning horizon",
                   interval=(start.isoformat(), end.isoformat()), tasks=member_ids, block_id=block_id)
        expected_duration = max(task_requirements(task, allowances).required_minutes for task in members)
        if (end - start).total_seconds() != 60 * expected_duration:
            reject("RESERVATION_DURATION_INVALID", "Reservation does not include exact setup/work/release duration",
                   interval=(start.isoformat(), end.isoformat()), tasks=member_ids, block_id=block_id)
        footprints = {tuple(task["_capacity_resource_ids"]) for task in members}
        section_sets = {tuple(task["_section_ids"]) for task in members}
        departments = {task.get("department") for task in members if task.get("department")}
        if (len(footprints) != 1 or len(section_sets) != 1
                or block.get("integrated") != (len(departments) >= 2)
                or any(not evaluate_compatibility(a, b, CompatibilityPolicy()).eligible
                       for a, b in combinations(members, 2))):
            reject("POSSESSION_MEMBERSHIP_INVALID", "Members do not form a compatible synchronized possession",
                   tasks=member_ids, block_id=block_id)
        expected_resources = members[0]["_capacity_resource_ids"]
        expected_sections = members[0]["_section_ids"]
        if ((block.get("capacity_resource_ids") is not None
             and tuple(block["capacity_resource_ids"]) != expected_resources)
                or (block.get("section_ids") is not None
                    and tuple(block["section_ids"]) != expected_sections)
                or block.get("section_id") != members[0]["section_id"]):
            reject("POSSESSION_FOOTPRINT_CHANGED", "Block footprint differs from member tasks",
                   tasks=member_ids, block_id=block_id)
        status = block.get("status", "PLANNED")
        historical = status == "COMPLETED"
        active = status == "IN_PROGRESS"
        if historical or active:
            actual_start = block.get("actual_start_time")
            actual_end = block.get("actual_end_time")
            if not actual_start or (historical and not actual_end) or (active and actual_end):
                reject("INVALID_EXECUTION_SNAPSHOT", "Actual execution timestamps are missing or inconsistent",
                       tasks=member_ids, block_id=block_id)
                continue
            actual_start_dt = parse_datetime(actual_start)
            if cutoff and actual_start_dt > cutoff:
                reject("INVALID_EXECUTION_SNAPSHOT", "Actual start is after snapshot",
                       tasks=member_ids, block_id=block_id)
            if historical:
                actual_end_dt = parse_datetime(actual_end)
                if actual_end_dt <= actual_start_dt or (cutoff and actual_end_dt > cutoff):
                    reject("INVALID_EXECUTION_SNAPSHOT", "Completed end is outside actual execution history",
                           tasks=member_ids, block_id=block_id)
            else:
                remaining = block.get("remaining_minutes_by_task")
                handback = block.get("remaining_handback_minutes")
                if (cutoff is None or not isinstance(remaining, dict)
                        or set(remaining) != set(member_ids)
                        or any(type(value) is not int or value < 0 for value in remaining.values())
                        or type(handback) is not int or handback < 0
                        or not any(remaining.values()) and not handback):
                    reject("INVALID_EXECUTION_SNAPSHOT", "Active residual occupation is missing or invalid",
                           tasks=member_ids, block_id=block_id)
                    continue
                residual_end = cutoff + timedelta(minutes=max(handback, *remaining.values()))
                for resource in expected_resources:
                    infra.append((resource, cutoff, residual_end, tuple(member_ids), block_id))
                for movement in data.get("train_occupancy", []):
                    if not set(expected_resources).intersection(movement_capacity_resources(movement, by_section)):
                        continue
                    protected_start = parse_datetime(movement["entry_time"]) - timedelta(
                        minutes=allowances.safety_before_minutes)
                    protected_end = parse_datetime(movement["exit_time"]) + timedelta(
                        minutes=allowances.safety_after_minutes)
                    if _overlap(cutoff, residual_end, protected_start, protected_end):
                        reject("TRAIN_PROTECTION_CONFLICT", "Active residual overlaps protected train",
                               resource_id=movement["section_id"],
                               interval=(max(cutoff, protected_start).isoformat(),
                                         min(residual_end, protected_end).isoformat()),
                               tasks=member_ids, block_id=block_id)
                for task in members:
                    release = cutoff + timedelta(minutes=remaining[task["task_id"]])
                    if task.get("crew_type"):
                        crew.append((task["crew_type"], cutoff, release, (task["task_id"],), block_id))
                    if task.get("machine_type"):
                        machine.append((task["machine_type"], cutoff, release, (task["task_id"],), block_id))
            continue
        if status == "CANCELLED":
            reject("TASK_ACCOUNTING_INVALID", "Canceled work must be historical, not a scheduled possession",
                   tasks=member_ids, block_id=block_id)
            continue
        if cutoff and start < cutoff:
            reject("UNSTARTED_WORK_IN_PAST", "Future work starts before execution snapshot",
                   interval=(start.isoformat(), end.isoformat()), tasks=member_ids, block_id=block_id)
        for task in members:
            if task.get("deadline") and end > parse_datetime(task["deadline"]):
                reject("DEADLINE_VIOLATION", "Reservation ends after task deadline",
                       tasks=(task["task_id"],), block_id=block_id)
            if not any(w.footprint_id == task["_footprint_id"]
                       and parse_datetime(w.usable_start) <= start
                       and end <= parse_datetime(w.usable_end) for w in windows):
                reject("WINDOW_UNAVAILABLE", "Reservation is outside a safety-adjusted train window",
                       tasks=(task["task_id"],), block_id=block_id)
            if resources:
                if task.get("requires_power_block") or task.get("requires_power_isolation"):
                    for section_id in task["_section_ids"]:
                        if section_id in resources.power_windows and not _contained(
                            start, end, resources.power_windows[section_id]
                        ):
                            reject("POWER_WINDOW_UNAVAILABLE", "Isolation window does not cover reservation",
                                   resource_id=section_id, tasks=(task["task_id"],), block_id=block_id)
                for field, calendars, code in (
                    ("crew_type", resources.crew_windows, "CREW_UNAVAILABLE"),
                    ("machine_type", resources.machine_windows, "MACHINE_UNAVAILABLE"),
                ):
                    pool = task.get(field)
                    if pool in calendars and not _contained(start, end, calendars[pool]):
                        reject(code, "Resource calendar does not cover reservation",
                               resource_id=pool, tasks=(task["task_id"],), block_id=block_id)
            if task.get("crew_type"):
                task_end = start + timedelta(minutes=task_requirements(task, allowances).required_minutes)
                crew.append((task["crew_type"], start, task_end, (task["task_id"],), block_id))
            if task.get("machine_type"):
                task_end = start + timedelta(minutes=task_requirements(task, allowances).required_minutes)
                machine.append((task["machine_type"], start, task_end, (task["task_id"],), block_id))
        for resource in expected_resources:
            infra.append((resource, start, end, tuple(member_ids), block_id))
        for movement in data.get("train_occupancy", []):
            if not set(expected_resources).intersection(movement_capacity_resources(movement, by_section)):
                continue
            entry, exit_time = parse_datetime(movement["entry_time"]), parse_datetime(movement["exit_time"])
            protected_start = entry - timedelta(minutes=allowances.safety_before_minutes)
            protected_end = exit_time + timedelta(minutes=allowances.safety_after_minutes)
            if _overlap(start, end, protected_start, protected_end):
                reject("TRAIN_PROTECTION_CONFLICT", f"Overlaps protected train {movement['train_id']}",
                       resource_id=movement["section_id"],
                       interval=(max(start, protected_start).isoformat(),
                                 min(end, protected_end).isoformat()),
                       tasks=member_ids, block_id=block_id)

    for task_id in set(required_task_ids) | {
        task["task_id"] for task in tasks if task.get("required") is True
    }:
        if task_id not in seen_tasks:
            reject("REQUIRED_TASK_MISSING", "Required task is absent from complete plan", tasks=(task_id,))
    if unscheduled_task_ids is not None:
        absent = set(by_task) - seen_tasks
        if set(unscheduled_task_ids) != absent:
            reject("TASK_ACCOUNTING_INVALID", "Unscheduled list does not match absent tasks",
                   tasks=tuple(sorted(absent ^ set(unscheduled_task_ids))))
    for block_id in set(fixed_block_ids):
        parent = parent_by_id.get(block_id)
        candidate = by_block_id.get(block_id)
        if parent is None or candidate is None or _signature(parent) != _signature(candidate):
            reject("FIXED_COMPLEMENT_CHANGED", "Outside-scope possession changed",
                   block_id=block_id)
    for block_id, parent in parent_by_id.items():
        if parent.get("status") == "COMPLETED" and (
            block_id not in by_block_id or _signature(parent) != _signature(by_block_id[block_id])
        ):
            reject("COMPLETED_HISTORY_CHANGED", "Completed possession history changed", block_id=block_id)
        if parent.get("status") == "IN_PROGRESS" and (
            block_id not in by_block_id or _signature(parent) != _signature(by_block_id[block_id])
        ):
            reject("ACTIVE_EXECUTION_CHANGED", "In-progress possession changed", block_id=block_id)
        if parent.get("locked") or parent.get("status") == "FROZEN":
            if block_id not in by_block_id or _signature(parent) != _signature(by_block_id[block_id]):
                reject("LOCKED_COMMITMENT_CHANGED", "Locked possession changed", block_id=block_id)
        if set(parent.get("tasks", ())) & seen_tasks and block_id not in by_block_id:
            reject("POSSESSION_ID_CHANGED", "Existing possession ID was replaced", block_id=block_id)

    violations.extend(_capacity_violations(infra, {pool: 1 for pool, *_ in infra},
                                            "INFRASTRUCTURE_CAPACITY_EXCEEDED"))
    if resources:
        violations.extend(_capacity_violations(crew, resources.crew_capacities,
                                                "CREW_CAPACITY_EXCEEDED"))
        violations.extend(_capacity_violations(machine, resources.machine_capacities,
                                                "MACHINE_CAPACITY_EXCEEDED"))
        for reservations, outages, code in (
            (crew, resources.crew_outages, "CREW_CAPACITY_EXCEEDED"),
            (machine, resources.machine_outages, "MACHINE_CAPACITY_EXCEEDED"),
        ):
            for resource_id, start, end, task_ids, block_id in reservations:
                for outage in outages.get(resource_id, ()):
                    left, right = parse_datetime(outage.start_time), parse_datetime(outage.end_time)
                    if _overlap(start, end, left, right):
                        reject(code, "Reservation overlaps bounded full-capacity outage",
                               resource_id=resource_id,
                               interval=(max(start, left).isoformat(), min(end, right).isoformat()),
                               tasks=task_ids, block_id=block_id)
    return ValidationReport(tuple(violations))
