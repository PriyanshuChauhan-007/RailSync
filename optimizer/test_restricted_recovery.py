"""Restricted recovery uses the full CP-SAT model with fixed outside decisions."""

import pytest

from optimizer.candidate_windows import OperationalAllowances
from optimizer.recovery import recover_schedule
from optimizer.resources import PowerWindow, ResourceContext


START = "2026-09-21T08:00:00+05:30"
END = "2026-09-21T12:00:00+05:30"
AS_OF = "2026-09-21T09:00:00+05:30"
ALLOW = OperationalAllowances(5, 5, 5, 5)


def fixture():
    data = {"maintenance_tasks": [
        dict(task_id="A", section_id="S_A", duration_minutes=35,
             criticality=5, urgency=5, crew_type="A_CREW", machine_type="M_SHARED",
             deadline="2026-09-21T10:45:00+05:30", required=True),
        dict(task_id="B", section_id="S_B", duration_minutes=35,
             criticality=5, urgency=5, crew_type="B_CREW", machine_type="M_SHARED",
             deadline="2026-09-21T12:00:00+05:30", required=True),
        dict(task_id="U", section_id="S_U", duration_minutes=35,
             criticality=5, urgency=5, crew_type="U_CREW", machine_type="M_U",
             required=True),
    ], "train_occupancy": []}
    resources = ResourceContext(
        crew_capacities={"A_CREW": 1, "B_CREW": 1, "U_CREW": 1},
        machine_capacities={"M_SHARED": 1, "M_U": 1},
        crew_windows={pool: (PowerWindow(START, END),)
                      for pool in ("A_CREW", "B_CREW", "U_CREW")},
        machine_windows={pool: (PowerWindow(START, END),)
                         for pool in ("M_SHARED", "M_U")},
    )
    def block(block_id, section, start, end, task):
        return dict(block_id=block_id, section_id=section, start_time=start,
                    end_time=end, tasks=[task], integrated=False, status="PLANNED")
    parent = [
        block("P_A", "S_A", AS_OF, "2026-09-21T09:45:00+05:30", "A"),
        block("P_B", "S_B", "2026-09-21T10:00:00+05:30",
              "2026-09-21T10:45:00+05:30", "B"),
        block("P_U", "S_U", "2026-09-21T10:00:00+05:30",
              "2026-09-21T10:45:00+05:30", "U"),
    ]
    disruption = dict(type="MACHINE_UNAVAILABLE", machine_type="M_SHARED",
                      event_id="OUTAGE_1", start_time=AS_OF,
                      end_time="2026-09-21T10:00:00+05:30", effective_time=AS_OF)
    return data, resources, parent, disruption


def test_restricted_repair_fixes_complement_and_preserves_membership():
    data, resources, parent, disruption = fixture()
    with pytest.raises(RuntimeError, match="infeasible"):
        recover_schedule(data, parent, disruption, START, END,
                         resource_context=resources, allowances=ALLOW,
                         mutable_block_ids={"P_A"})
    repaired = recover_schedule(data, parent, disruption, START, END,
                                resource_context=resources, allowances=ALLOW,
                                mutable_block_ids={"P_A", "P_B"})
    blocks = {block["block_id"]: block for block in repaired["plan"]["blocks"]}
    assert blocks["P_A"]["start_time"] == "2026-09-21T10:00:00+05:30"
    assert blocks["P_B"]["start_time"] >= "2026-09-21T10:45:00+05:30"
    assert blocks["P_U"]["start_time"] == parent[2]["start_time"]
    assert all(blocks[block_id]["tasks"] == [block_id[-1]] for block_id in blocks)
    assert repaired["diagnostics"]["complete_validation"]["valid"]
