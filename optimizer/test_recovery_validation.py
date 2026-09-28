"""Independent complete-plan validation at the first P0 acceptance gate."""

from copy import deepcopy

from optimizer.candidate_windows import OperationalAllowances
from optimizer.optimizer import optimize_schedule
from optimizer.resources import PowerWindow, ResourceContext
from optimizer.recovery_validation import validate_complete_plan


START = "2026-09-21T08:00:00+05:30"
END = "2026-09-21T12:00:00+05:30"
ALLOW = OperationalAllowances(
    safety_after_minutes=5, safety_before_minutes=5,
    setup_minutes=5, release_minutes=5,
)


def fixture():
    data = {
        "maintenance_tasks": [
            dict(task_id="A", section_id="S_A", department="ENGINEERING",
                 duration_minutes=30, deadline="2026-09-21T11:00:00+05:30",
                 criticality=5, urgency=5, crew_type="CREW_A", machine_type="M_A",
                 requires_power_block=True),
            dict(task_id="B", section_id="S_B", department="ENGINEERING",
                 duration_minutes=30, deadline="2026-09-21T11:00:00+05:30",
                 criticality=5, urgency=5, crew_type="CREW_B", machine_type="M_B"),
        ],
        "train_occupancy": [dict(train_id="T_A", section_id="S_A",
                                  entry_time="2026-09-21T09:50:00+05:30",
                                  exit_time="2026-09-21T10:10:00+05:30")],
    }
    resources = ResourceContext(
        crew_capacities={"CREW_A": 1, "CREW_B": 1},
        machine_capacities={"M_A": 1, "M_B": 1},
        power_windows={"S_A": (PowerWindow(START, END),)},
    )
    blocks = [
        dict(block_id="P_A", section_id="S_A", start_time="2026-09-21T09:00:00+05:30",
             end_time="2026-09-21T09:40:00+05:30", tasks=["A"], integrated=False),
        dict(block_id="P_B", section_id="S_B", start_time="2026-09-21T09:00:00+05:30",
             end_time="2026-09-21T09:40:00+05:30", tasks=["B"], integrated=False),
    ]
    return data, resources, blocks


def check(data, resources, blocks, **kwargs):
    return validate_complete_plan(
        data, blocks, START, END, resources=resources, allowances=ALLOW, **kwargs
    )


def codes(report):
    return {violation.code for violation in report.violations}


def test_valid_manual_and_optimizer_produced_plans_pass():
    data, resources, blocks = fixture()
    assert check(data, resources, blocks, required_task_ids={"A", "B"}).valid
    solved = optimize_schedule(data, START, END, resource_context=resources, allowances=ALLOW)
    assert solved["status"] == "success"
    assert check(data, resources, solved["blocks"]).valid


def test_train_conflict_has_named_structured_violation():
    data, resources, blocks = fixture()
    blocks[0]["start_time"] = "2026-09-21T09:55:00+05:30"
    blocks[0]["end_time"] = "2026-09-21T10:35:00+05:30"
    report = check(data, resources, blocks)
    assert "TRAIN_PROTECTION_CONFLICT" in codes(report)
    conflict = next(v for v in report.violations if v.code == "TRAIN_PROTECTION_CONFLICT")
    assert conflict.resource_id == "S_A"
    assert conflict.involved_tasks == ("A",)
    assert conflict.interval is not None


def test_crew_and_machine_overloads_have_separate_reasons():
    data, resources, blocks = fixture()
    data["maintenance_tasks"][1]["crew_type"] = "CREW_A"
    data["maintenance_tasks"][1]["machine_type"] = "M_A"
    assert {"CREW_CAPACITY_EXCEEDED", "MACHINE_CAPACITY_EXCEEDED"} <= codes(
        check(data, resources, blocks)
    )


def test_invalid_isolation_and_required_omission_are_rejected():
    data, resources, blocks = fixture()
    resources = ResourceContext(
        crew_capacities=resources.crew_capacities,
        machine_capacities=resources.machine_capacities,
        power_windows={"S_A": ()},
    )
    assert "POWER_WINDOW_UNAVAILABLE" in codes(check(data, resources, blocks))
    assert "REQUIRED_TASK_MISSING" in codes(
        check(data, resources, blocks[1:], required_task_ids={"A", "B"})
    )


def test_past_start_and_fixed_complement_change_are_rejected():
    data, resources, blocks = fixture()
    assert "UNSTARTED_WORK_IN_PAST" in codes(check(
        data, resources, blocks, snapshot_as_of="2026-09-21T09:15:00+05:30"
    ))
    changed = deepcopy(blocks)
    changed[1]["start_time"] = "2026-09-21T09:10:00+05:30"
    changed[1]["end_time"] = "2026-09-21T09:50:00+05:30"
    assert "FIXED_COMPLEMENT_CHANGED" in codes(check(
        data, resources, changed, parent_blocks=blocks, fixed_block_ids={"P_B"}
    ))


def test_completed_history_change_and_integrated_membership_are_rejected():
    data, resources, blocks = fixture()
    parent = deepcopy(blocks)
    parent[0].update(status="COMPLETED", actual_start_time=parent[0]["start_time"],
                     actual_end_time=parent[0]["end_time"])
    changed = deepcopy(parent)
    changed[0]["actual_end_time"] = "2026-09-21T09:45:00+05:30"
    assert "COMPLETED_HISTORY_CHANGED" in codes(check(
        data, resources, changed, parent_blocks=parent,
        snapshot_as_of="2026-09-21T10:00:00+05:30"
    ))
    broken = deepcopy(blocks)
    broken[0]["integrated"] = True
    assert "POSSESSION_MEMBERSHIP_INVALID" in codes(check(data, resources, broken))


def test_deadline_footprint_and_unscheduled_accounting_are_named():
    data, resources, blocks = fixture()
    changed = deepcopy(blocks)
    changed[0]["capacity_resource_ids"] = ["TRK_WRONG"]
    data["maintenance_tasks"][0]["deadline"] = "2026-09-21T09:30:00+05:30"
    report = check(data, resources, changed, unscheduled_task_ids=["A"])
    assert {"DEADLINE_VIOLATION", "POSSESSION_FOOTPRINT_CHANGED",
            "TASK_ACCOUNTING_INVALID"} <= codes(report)


def test_two_integrated_members_using_same_crew_consume_two_units():
    data, resources, blocks = fixture()
    data["maintenance_tasks"][1].update(
        section_id="S_A", department="S&T", crew_type="CREW_A", machine_type=None,
        compatibility_group="SHARED",
    )
    data["maintenance_tasks"][0]["compatibility_group"] = "SHARED"
    integrated = deepcopy(blocks[:1])
    integrated[0]["tasks"] = ["A", "B"]
    integrated[0]["integrated"] = True
    assert "CREW_CAPACITY_EXCEEDED" in codes(check(data, resources, integrated))


def test_forward_optimizer_records_independent_complete_validation():
    data, resources, _ = fixture()
    diagnostics = {}
    solved = optimize_schedule(
        data, START, END, resource_context=resources, allowances=ALLOW,
        diagnostics=diagnostics,
    )
    assert solved["status"] == "success"
    assert diagnostics["complete_validation"] == {"valid": True, "violations": []}


def test_active_residual_consumes_crew_and_execution_facts_are_immutable():
    data, resources, blocks = fixture()
    blocks[0].update(
        status="IN_PROGRESS",
        start_time="2026-09-21T08:30:00+05:30",
        end_time="2026-09-21T09:10:00+05:30",
        actual_start_time="2026-09-21T08:35:00+05:30",
        remaining_minutes_by_task={"A": 30},
        remaining_handback_minutes=0,
    )
    data["maintenance_tasks"][1]["crew_type"] = "CREW_A"
    report = check(data, resources, blocks, snapshot_as_of="2026-09-21T09:00:00+05:30")
    assert "CREW_CAPACITY_EXCEEDED" in codes(report)
    parent = deepcopy(blocks)
    blocks[0]["actual_start_time"] = "2026-09-21T08:40:00+05:30"
    assert "ACTIVE_EXECUTION_CHANGED" in codes(check(
        data, resources, blocks, parent_blocks=parent,
        snapshot_as_of="2026-09-21T09:00:00+05:30"
    ))


def test_bounded_machine_outage_rejects_only_overlapping_candidate():
    data, resources, blocks = fixture()
    limited = ResourceContext(
        crew_capacities=resources.crew_capacities,
        machine_capacities=resources.machine_capacities,
        power_windows=resources.power_windows,
        machine_outages={"M_A": (PowerWindow(
            "2026-09-21T09:00:00+05:30", "2026-09-21T10:00:00+05:30"
        ),)},
    )
    assert "MACHINE_CAPACITY_EXCEEDED" in codes(check(data, limited, blocks))
    blocks[0]["start_time"] = "2026-09-21T10:15:00+05:30"
    blocks[0]["end_time"] = "2026-09-21T10:55:00+05:30"
    assert "MACHINE_CAPACITY_EXCEEDED" not in codes(check(data, limited, blocks))
