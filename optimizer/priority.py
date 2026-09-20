"""Transparent maintenance priority score; never a feasibility constraint."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class PriorityWeights:
    """Point ceilings; the default four factors total exactly 100 points."""

    criticality: int = 40
    urgency: int = 30
    overdue: int = 20
    next_window_scarcity: int = 10

    def __post_init__(self):
        values = vars(self).values()
        if any(type(value) is not int or value < 0 for value in values):
            raise ValueError("Priority weights must be non-negative integers")
        if sum(values) != 100:
            raise ValueError("Priority weights must sum to 100")


@dataclass(frozen=True)
class PriorityResult:
    priority_score: int
    priority_band: str
    factor_breakdown: dict[str, int]
    human_readable_explanation: str

    def as_dict(self) -> dict[str, Any]:
        return dict(
            priority_score=self.priority_score,
            priority_band=self.priority_band,
            factor_breakdown=dict(self.factor_breakdown),
            human_readable_explanation=self.human_readable_explanation,
        )


def _integer_factor(task: Mapping[str, Any], name: str) -> int:
    value = task.get(name, 0)
    if type(value) is not int or value < 0:
        raise ValueError(f"{name} must be a non-negative integer")
    return value


def _points(weight: int, value: int, maximum: int) -> int:
    return (weight * min(value, maximum) + maximum // 2) // maximum


def score_task(
    task: Mapping[str, Any],
    feasible_window_count: int,
    weights: PriorityWeights = PriorityWeights(),
) -> PriorityResult:
    """Score existing fields and counted feasible windows, with no prediction.

    Criticality and urgency are 0..10 input scales; overdue saturates at
    30 days. Scarcity gives full points for one legal window, half for two,
    and none for zero or three-plus. Zero legal windows never earns priority
    for infeasible work. Every factor is an integer point contribution.
    """
    if type(feasible_window_count) is not int or feasible_window_count < 0:
        raise ValueError("feasible_window_count must be a non-negative integer")
    criticality = _integer_factor(task, "criticality")
    urgency = _integer_factor(task, "urgency")
    overdue = _integer_factor(task, "overdue_days")
    scarcity = (weights.next_window_scarcity if feasible_window_count == 1 else
                weights.next_window_scarcity // 2 if feasible_window_count == 2 else 0)
    factors = {
        "criticality": _points(weights.criticality, criticality, 10),
        "urgency": _points(weights.urgency, urgency, 10),
        "overdue": _points(weights.overdue, overdue, 30),
        "next_window_scarcity": scarcity,
    }
    score = sum(factors.values())
    band = "CRITICAL" if score >= 80 else "HIGH" if score >= 60 else "MEDIUM" if score >= 35 else "ROUTINE"
    ranked = sorted(((name, points) for name, points in factors.items() if points),
                    key=lambda item: (-item[1], item[0]))
    if ranked:
        reasons = ", ".join(f"{name.replace('_', ' ')} +{points}" for name, points in ranked)
        explanation = f"{band.title()} priority ({score}/100): {reasons}."
    else:
        explanation = "Routine priority (0/100): no scored factor is present."
    return PriorityResult(score, band, factors, explanation)
