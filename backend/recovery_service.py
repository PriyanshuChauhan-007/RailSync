"""Validate a supplied current plan against registered inputs, then recover it."""
from dataclasses import replace
from uuid import uuid4
import hashlib
import json

from ml.inference import planning_risk
from optimizer.metrics import compare_service
from optimizer.optimizer import optimize_schedule
from optimizer.recovery import recover_with_escalation, _validate_execution_snapshot
from optimizer.runtime import DEMO_SOLVE_LIMIT_SECONDS
from . import planning_service as planning
from . import operations_service


_pending_recoveries = {}


def _non_integrated_baseline(territory, start, end, risk_penalties):
    diagnostics = {}
    plan = optimize_schedule(
        territory.as_optimizer_input(), start, end,
        resource_context=territory.resource_context,
        allowances=planning.DEMO_ALLOWANCES,
        allow_integration=False,
        diagnostics=diagnostics,
        time_limit_seconds=DEMO_SOLVE_LIMIT_SECONDS,
        risk_penalties=risk_penalties,
    )
    if plan["status"] != "success":
        raise planning.PlanningExecutionError(
            f"Recovery comparison planning failed: {plan['status']}"
        )
    return dict(
        diagnostics["service_metrics"],
        plan=plan,
        proof_state=diagnostics["proof_state"],
        task_windows=diagnostics["task_windows"],
        pair_checks=diagnostics["pair_checks"],
        outcomes=diagnostics["outcomes"],
    )


def reoptimize(request):
    territory = planning.load_planning_territory(request.territory_id)
    start, end, _ = planning._horizon(territory)
    if (request.horizon_start, request.horizon_end) != (start,end):
        raise planning.InvalidPlanningRequest("Recovery horizon must match the registered base planning horizon")
    planning._validate_resource_coverage(territory)
    data = territory.as_optimizer_input()
    base = request.current_plan.model_dump()
    authoritative_identity, state_revision = operations_service.registry_snapshot(request.territory_id)
    bound_parent_id = request.parent_plan_id or (
        authoritative_identity["plan_id"] if authoritative_identity else None
    )
    bound_parent = (operations_service.copilot_plan(bound_parent_id, request.territory_id)
                    if bound_parent_id else None)
    if bound_parent_id and bound_parent is None:
        raise operations_service.StalePlanError("Parent plan is no longer registered")
    try:
        _validate_execution_snapshot(base["blocks"], request.snapshot_as_of or request.disruption.effective_time or start)
    except ValueError as error:
        raise planning.InvalidPlanningRequest(str(error)) from error
    if bound_parent is not None:
        registered_base = request.current_plan.__class__(
            blocks=bound_parent["blocks"],
            unscheduled_tasks=bound_parent["unscheduled_tasks"],
        ).model_dump()
        if base != registered_base:
            raise operations_service.StalePlanError(
                "Client current_plan differs from the registered parent revision"
            )
    input_binding = {
        "territory_id": request.territory_id,
        "horizon_start": start, "horizon_end": end,
        "parent_plan_id": bound_parent_id,
        "base": base,
        "disruption": request.disruption.model_dump(),
        "snapshot_as_of": request.snapshot_as_of or request.disruption.effective_time or start,
    }
    input_digest = hashlib.sha256(json.dumps(
        input_binding, sort_keys=True, default=str
    ).encode("utf-8")).hexdigest()
    scheduled = {t for b in base["blocks"] for t in b["tasks"]}
    expected = {t["task_id"] for t in territory.maintenance_tasks} - scheduled
    if set(base["unscheduled_tasks"]) != expected or len(base["unscheduled_tasks"]) != len(expected):
        raise planning.InvalidPlanningRequest("Current plan task accounting does not match the territory")
    try:
        penalties, risk = planning_risk(data["train_occupancy"], request.risk_mode,
                                        [p.model_dump() for p in request.risk_profiles])
        result = recover_with_escalation(data, base["blocks"], request.disruption.model_dump(), start, end,
            resource_context=territory.resource_context, allowances=planning.DEMO_ALLOWANCES,
            time_limit_seconds=DEMO_SOLVE_LIMIT_SECONDS, risk_penalties=penalties,
            snapshot_as_of=request.snapshot_as_of)
        if result["status"] != "success":
            raise planning.PlanningExecutionError(
                f"Recovery has no validated service-floor proposal: {result['attempts']}")
    except (ValueError, TypeError, KeyError) as error:
        raise planning.InvalidPlanningRequest(str(error)) from error
    except RuntimeError as error:
        raise planning.PlanningExecutionError(str(error)) from error
    facts, plan = result["diagnostics"], result["plan"]
    summary = dict(facts["service_metrics"], plan=plan, proof_state=facts["proof_state"],
                   task_windows=facts["task_windows"], pair_checks=facts["pair_checks"], outcomes=facts["outcomes"])
    recovered = dict(plan, proof_state=facts["proof_state"],
        service_metrics=planning._analysis_plan(summary)["metrics"],
        block_diagnostics=planning._block_diagnostics(result["maintenance_tasks"], summary),
        unscheduled_diagnostics=planning._unscheduled_diagnostics(result["maintenance_tasks"], summary))
    changes = result["changes"]
    recovery_id = uuid4().hex
    disrupted_territory = replace(
        territory,
        train_occupancy=result["train_occupancy"],
        maintenance_tasks=result["maintenance_tasks"],
        resource_context=result["resource_context"],
    )
    baseline = _non_integrated_baseline(disrupted_territory, start, end, penalties)
    _pending_recoveries[recovery_id] = {
        "territory": disrupted_territory,
        "baseline": baseline,
        "optimized": summary,
        "parent_plan_id": bound_parent_id,
        "parent_plan_version": bound_parent["identity"]["version"] if bound_parent else None,
        "state_revision": state_revision,
        "input_digest": input_digest,
        "input_binding": input_binding,
        "risk": risk,
        "copilot_config": {
            "risk_mode": request.risk_mode,
            "risk_profiles": [profile.model_dump() for profile in request.risk_profiles],
        },
    }
    return dict(status="success", recovery_id=recovery_id,
        territory_id=request.territory_id, horizon_start=start, horizon_end=end,
        disruption=request.disruption.model_dump(), scenario_provenance="SYNTHETIC_FORECAST_SCENARIO",
        base_plan=base, recovered_plan=recovered, recovery_metrics=changes["metrics"],
        block_changes=changes["block_changes"], task_changes=changes["task_changes"],
        newly_unscheduled_task_ids=changes["newly_unscheduled_task_ids"],
        invalidated_blocks=result["invalidated_blocks"], affected_sections=result["affected_sections"],
        train_occupancy=result["train_occupancy"], risk=risk,
        immutable_task_ids=result["immutable_task_ids"],
        escalation_required=result["escalation_required"],
        selected_tier=result["tier"], recovery_attempts=result["attempts"])


def adopt_recovery(request):
    pending = _pending_recoveries.get(request.recovery_id)
    if pending is None:
        raise planning.InvalidPlanningRequest("Recovery preview is unknown or has already been adopted")
    stored_parent = pending["parent_plan_id"]
    if stored_parent and request.parent_plan_id != stored_parent:
        raise planning.InvalidPlanningRequest("Recovery preview does not belong to the supplied parent plan")

    with operations_service.registry_lock():
        if _pending_recoveries.get(request.recovery_id) is not pending:
            raise planning.InvalidPlanningRequest("Recovery preview has already been consumed")
        latest, state_revision = operations_service.registry_snapshot(pending["territory"].manifest.territory_id)
        if (stored_parent and (latest is None or latest["plan_id"] != stored_parent
                               or latest["version"] != pending["parent_plan_version"])):
            raise operations_service.StalePlanError("A newer plan superseded this recovery proposal")
        if state_revision != pending["state_revision"]:
            raise operations_service.StalePlanError("Execution or world state changed after recovery preview")
        if hashlib.sha256(json.dumps(
            pending["input_binding"], sort_keys=True, default=str
        ).encode("utf-8")).hexdigest() != pending["input_digest"]:
            raise operations_service.StalePlanError("Recovery proposal inputs changed after preview")
        territory = pending["territory"]
        optimized = pending["optimized"]
        baseline = pending["baseline"]
        comparison = compare_service(baseline, optimized)
        compared = {
            "baseline": baseline,
            "optimized": optimized,
            "comparison": comparison,
            "comparison_proof_state": (
                "FULLY_OPTIMAL"
                if baseline["proof_state"] == optimized["proof_state"] == "FULLY_OPTIMAL"
                else "FEASIBLE_BOUNDED"
            ),
        }
        response = planning._response(
            territory,
            compared,
            parent_plan_id=stored_parent or request.parent_plan_id,
            copilot_config=pending["copilot_config"],
        )
        _pending_recoveries.pop(request.recovery_id, None)
        return dict(response, risk=pending["risk"])
