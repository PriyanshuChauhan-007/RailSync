# Explainable maintenance priority

RailSync computes a deterministic 0-100 priority score from recorded task fields and the count of feasible candidate windows. The score is an explanation and a late solver objective stage. It never makes an infeasible reservation legal or overrides required-work constraints.

| Factor | Default points | Normalization |
|---|---:|---|
| Criticality | 40 | `min(criticality, 10) / 10` |
| Urgency | 30 | `min(urgency, 10) / 10` |
| Overdue age | 20 | `min(overdue_days, 30) / 30` |
| Next-window scarcity | 10 | one feasible window = 10; two = 5; zero or three-plus = 0 |

Each proportional contribution is rounded to the nearest integer using integer arithmetic. The four weights must be nonnegative integers summing to 100 and can be changed through `PriorityWeights`. Input factor values must be nonnegative integers. Priority bands are `CRITICAL` (80-100), `HIGH` (60-79), `MEDIUM` (35-59), and `ROUTINE` (0-34).

The CP-SAT hierarchy remains criticality, urgency, overdue age, task count, then priority score, then the existing stability and efficiency stages. This placement keeps service delivery ahead of the new tie-break. A lower stage runs only after the preceding stage is proven optimal.

The [synthetic worked example](../artifacts/priority/example.json) has criticality 10, urgency 8, overdue age 15 days, and one feasible window. It scores `40 + 24 + 10 + 10 = 84/100`. This is an arithmetic example, not model-accuracy evidence or a measured operational outcome.
