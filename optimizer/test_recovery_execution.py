"""Gate 3 execution and bounded disruption contract tests."""

from copy import deepcopy

import pytest

from optimizer.candidate_windows import OperationalAllowances
from optimizer.recovery import apply_disruption, apply_train_delay, recover_schedule
from optimizer.resources import PowerWindow, ResourceContext, reservation_start_ranges, validate_capacities


START = "2026-09-21T08:00:00+05:30"
END = "2026-09-21T12:00:00+05:30"
AS_OF = "2026-09-21T09:00:00+05:30"
ALLOW = OperationalAllowances(5, 5, 5, 5)


def source():
    data = {"maintenance_tasks": [
        dict(task_id="A", section_id="S_A", department="ENGINEERING",
             duration_minutes=35, criticality=5, urgency=5,
             crew_type="C", machine_type="M")
    ], "train_occupancy": []}
    context = ResourceContext(
        crew_capacities={"C": 1}, machine_capacities={"M": 1},
        crew_windows={"C": (PowerWindow(START, END),)},
        machine_windows={"M": (PowerWindow(START, END),)},
        power_windows={"S_A": (PowerWindow(START, END),)},
    )
    return data, context


def test_machine_outage_is_bounded_and_does_not_mutate_source():
    data, context = source()
    original = deepcopy(data)
    event = dict(event_id="E1", type="MACHINE_UNAVAILABLE", machine_type="M",
                 start_time=AS_OF, end_time="2026-09-21T10:00:00+05:30")
    changed, limited, _ = apply_disruption(data, context, event, START, END)
    assert {key: value for key, value in changed.items() if key != "_applied_event_ids"} == original
    assert data == original
    assert context.machine_capacities["M"] == limited.machine_capacities["M"] == 1
    assert limited.machine_outages["M"] == (PowerWindow(AS_OF, event["end_time"]),)
    task = data["maintenance_tasks"][0]
    assert reservation_start_ranges(task, 45, 60, 60, START, limited)[0] == []
    assert reservation_start_ranges(task, 45, 120, 120, START, limited)[0] == [(120, 120)]
    with pytest.raises(ValueError, match="machine_type capacity exceeded"):
        validate_capacities([(task, 60, 105)], limited, origin=START)


def test_power_cancellation_removes_only_the_named_interval():
    data, context = source()
    event = dict(event_id="E2", type="POWER_ISOLATION_CANCELLED", section_ids=["S_A"],
                 start_time=AS_OF, end_time="2026-09-21T10:00:00+05:30")
    _, limited, _ = apply_disruption(data, context, event, START, END)
    assert limited.power_windows["S_A"] == (
        PowerWindow(START, AS_OF), PowerWindow(event["end_time"], END)
    )


def test_train_delay_keeps_completed_and_actual_entry_history():
    data = {"train_occupancy": [
        dict(train_id="T", section_id="S_A", entry_time="2026-09-21T08:00:00+05:30",
             exit_time="2026-09-21T08:30:00+05:30"),
        dict(train_id="T", section_id="S_B", entry_time="2026-09-21T08:50:00+05:30",
             exit_time="2026-09-21T09:10:00+05:30"),
        dict(train_id="T", section_id="S_C", entry_time="2026-09-21T09:20:00+05:30",
             exit_time="2026-09-21T09:40:00+05:30"),
    ]}
    changed = apply_train_delay(data, "T", 20, AS_OF)
    old, active, future = changed["train_occupancy"]
    assert old == data["train_occupancy"][0]
    assert active["entry_time"] == data["train_occupancy"][1]["entry_time"]
    assert active["exit_time"] == "2026-09-21T09:30:00+05:30"
    assert future["entry_time"] == "2026-09-21T09:40:00+05:30"


def test_recovery_rejects_missing_actual_execution_snapshot():
    data, context = source()
    parent = [dict(block_id="P_A", section_id="S_A", start_time="2026-09-21T08:30:00+05:30",
                   end_time="2026-09-21T09:15:00+05:30", tasks=["A"], integrated=False,
                   status="IN_PROGRESS")]
    with pytest.raises(ValueError, match="INVALID_EXECUTION_SNAPSHOT"):
        recover_schedule(data, parent,
                         dict(type="TRAIN_DELAY", train_id="T", delay_minutes=0,
                              effective_time=AS_OF), START, END,
                         resource_context=context, allowances=ALLOW)


def test_active_residual_reserves_resources_and_completed_work_stays_historical():
    data, context = source()
    data["maintenance_tasks"].extend([
        dict(task_id="B", section_id="S_B", department="SIGNALLING",
             duration_minutes=35, criticality=4, urgency=4,
             crew_type="C", machine_type="M"),
        dict(task_id="H", section_id="S_H", department="ENGINEERING",
             duration_minutes=35, criticality=3, urgency=3,
             crew_type="C2", machine_type="M2"),
    ])
    context = ResourceContext(
        crew_capacities={"C": 1, "C2": 1}, machine_capacities={"M": 1, "M2": 1},
        crew_windows={"C": (PowerWindow(START, END),), "C2": (PowerWindow(START, END),)},
        machine_windows={"M": (PowerWindow(START, END),), "M2": (PowerWindow(START, END),)},
    )
    parent = [
        dict(block_id="P_H", section_id="S_H", start_time=START,
             end_time="2026-09-21T08:45:00+05:30", tasks=["H"], integrated=False,
             status="COMPLETED", actual_start_time=START,
             actual_end_time="2026-09-21T08:45:00+05:30"),
        dict(block_id="P_A", section_id="S_A", start_time="2026-09-21T08:15:00+05:30",
             end_time=AS_OF, tasks=["A"], integrated=False,
             status="IN_PROGRESS", actual_start_time="2026-09-21T08:15:00+05:30",
             remaining_minutes_by_task={"A": 30}, remaining_handback_minutes=30),
        dict(block_id="P_B", section_id="S_B", start_time=AS_OF,
             end_time="2026-09-21T09:45:00+05:30", tasks=["B"], integrated=False,
             status="PLANNED"),
    ]
    result = recover_schedule(data, parent,
        dict(type="MACHINE_UNAVAILABLE", machine_type="M2",
             start_time="2026-09-21T10:00:00+05:30",
             end_time="2026-09-21T11:00:00+05:30", effective_time=AS_OF),
        START, END, resource_context=context, allowances=ALLOW)
    blocks = {block["block_id"]: block for block in result["plan"]["blocks"]}
    assert blocks["P_H"] == parent[0]
    assert blocks["P_A"] == parent[1]
    assert blocks["P_B"]["tasks"] == ["B"]
    assert blocks["P_B"]["start_time"] >= "2026-09-21T09:30:00+05:30"
    assert result["diagnostics"]["complete_validation"]["valid"]


def test_active_outage_conflict_is_not_repaired_by_moving_execution():
    data, context = source()
    parent = [dict(block_id="P_A", section_id="S_A",
                   start_time="2026-09-21T08:15:00+05:30", end_time=AS_OF,
                   tasks=["A"], integrated=False, status="IN_PROGRESS",
                   actual_start_time="2026-09-21T08:15:00+05:30",
                   remaining_minutes_by_task={"A": 30}, remaining_handback_minutes=30)]
    with pytest.raises(ValueError, match="EXECUTION_CONFLICT"):
        recover_schedule(data, parent,
            dict(type="MACHINE_UNAVAILABLE", machine_type="M", start_time=AS_OF,
                 end_time="2026-09-21T10:00:00+05:30", effective_time=AS_OF),
            START, END, resource_context=context, allowances=ALLOW)
