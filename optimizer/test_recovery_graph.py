"""Resource graph may select scope, but it cannot infer from geography."""

from optimizer.recovery_graph import build_recovery_graph
from optimizer.test_restricted_recovery import fixture, START, END, AS_OF, ALLOW


def test_shared_machine_selects_but_independent_possession_stays_out():
    data, resources, blocks, _ = fixture()
    graph = build_recovery_graph(data, blocks, START, END, resources=resources,
                                 allowances=ALLOW, snapshot_as_of=AS_OF)
    assert graph.expand({"P_A"}, 1) == {"P_A", "P_B"}
    assert "machine:M_SHARED" in graph.reasons[("P_A", "P_B")]
    assert "P_U" not in graph.expand({"P_A"}, 2)


def test_second_hop_follows_another_shared_pool():
    data, resources, blocks, _ = fixture()
    data["maintenance_tasks"].append(dict(
        task_id="C", section_id="S_C", duration_minutes=35,
        criticality=5, urgency=5, crew_type="B_CREW", machine_type="M_C",
        required=True,
    ))
    blocks.append(dict(block_id="P_C", section_id="S_C",
                       start_time="2026-09-21T11:00:00+05:30",
                       end_time="2026-09-21T11:45:00+05:30", tasks=["C"],
                       integrated=False, status="PLANNED"))
    from dataclasses import replace
    resources = replace(resources,
        machine_capacities={**resources.machine_capacities, "M_C": 1})
    graph = build_recovery_graph(data, blocks, START, END, resources=resources,
                                 allowances=ALLOW, snapshot_as_of=AS_OF)
    assert graph.expand({"P_A"}, 1) == {"P_A", "P_B"}
    assert graph.expand({"P_A"}, 2) == {"P_A", "P_B", "P_C"}
