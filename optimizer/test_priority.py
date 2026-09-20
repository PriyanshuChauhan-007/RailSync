"""Hand-checkable, deterministic maintenance priority evidence."""

import pytest

from optimizer.priority import PriorityWeights, score_task
from optimizer.optimizer import optimize_schedule


def task(**changes):
    value = dict(task_id="A", section_id="S", duration_minutes=35,
                 criticality=10, urgency=8, overdue_days=15)
    value.update(changes)
    return value


def test_worked_priority_example_and_breakdown_sum():
    result = score_task(task(), feasible_window_count=1)
    assert result.priority_score == 84
    assert result.priority_band == "CRITICAL"
    assert result.factor_breakdown == {
        "criticality": 40, "urgency": 24, "overdue": 10, "next_window_scarcity": 10,
    }
    assert sum(result.factor_breakdown.values()) == result.priority_score
    assert "criticality" in result.human_readable_explanation.lower()


def test_repeated_inputs_and_monotonic_factors():
    baseline = score_task(task(criticality=4, overdue_days=4), feasible_window_count=2)
    assert baseline == score_task(task(criticality=4, overdue_days=4), feasible_window_count=2)
    assert score_task(task(criticality=5, overdue_days=4), feasible_window_count=2).priority_score >= baseline.priority_score
    assert score_task(task(criticality=4, overdue_days=5), feasible_window_count=2).priority_score >= baseline.priority_score
    assert abs(score_task(task(criticality=4, overdue_days=5), feasible_window_count=2).priority_score - baseline.priority_score) <= 2


def test_weights_configurable_and_urgency_only_baseline():
    critical = score_task(task(criticality=10, urgency=1), feasible_window_count=3)
    urgent = score_task(task(criticality=1, urgency=10), feasible_window_count=3)
    assert critical.priority_score > urgent.priority_score
    urgency_only = PriorityWeights(criticality=0, urgency=100, overdue=0, next_window_scarcity=0)
    assert score_task(task(criticality=10, urgency=1), 3, urgency_only).priority_score < score_task(
        task(criticality=1, urgency=10), 3, urgency_only
    ).priority_score
    with pytest.raises(ValueError, match="sum to 100"):
        PriorityWeights(criticality=50, urgency=50, overdue=20, next_window_scarcity=0)


def test_priority_never_makes_an_impossible_task_feasible():
    data = {"maintenance_tasks": [task(deadline="2026-09-21T08:05:00")],
            "train_occupancy": []}
    facts = {}
    plan = optimize_schedule(
        data, "2026-09-21T08:00:00", "2026-09-21T09:00:00", diagnostics=facts,
    )
    assert plan["unscheduled_tasks"] == ["A"]
    assert facts["priority_scores"]["A"]["priority_score"] <= 100
    stages = [stage["stage"] for stage in facts["priority_stages"]]
    assert stages.index("task_count") < stages.index("priority_score")
