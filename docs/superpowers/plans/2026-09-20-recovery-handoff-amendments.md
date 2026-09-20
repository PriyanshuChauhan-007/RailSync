# RailSync Recovery Handoff Amendments

Apply these amendments to the reviewed P0A–H implementation handoff before execution. The existing Phase 0–2 architecture and three golden cases remain the governing specification.

## Recovery escalation

Escalate from LOCAL to EXPANDED to FULL_TERRITORY when a scope solve is proven `INFEASIBLE`, returns `NO_INCUMBENT`, produces a candidate below the service floor, policy requires broader scope, **or the independent complete-plan validator rejects the candidate for any reason**. A CP-SAT `FEASIBLE` status alone never authorizes acceptance.

Record the solver status, validator reasons, and tier for every rejected attempt. Do not relabel validator rejection as solver-proven infeasibility. If no valid candidate survives all attempted tiers, return `VALIDATION_FAILED` when a candidate was rejected by validation, with no adoptable proposal. A timeout with no solver candidate remains `NO_INCUMBENT`; neither state proves infeasibility.

Add a focused test that injects a solver-feasible candidate with a non-service-floor structural violation (for example, a fixed-complement change or crew overload). Assert that the tier is rejected, the next tier is attempted when budget remains, and no invalid plan is accepted or adopted.

## Checkpoint after each gate

After each P0 gate passes its named tests and `git diff --check`, save a reviewable checkpoint before starting the next gate. Prefer a commit containing only that gate's files; if unrelated pre-existing changes prevent a clean commit, record a clearly named checkpoint with the gate ID, test commands/results, and exact changed-file list. Do not sweep unrelated working-tree changes into a gate commit.

## Golden fixture data cross-check

Before using the generated JSON in solver tests, run a separate data assertion script against the files on disk. Assert the date, timezone, horizon, `as_of`, 45-minute reserved duration, five-minute train margins, bounded `M_SHARED` outage `09:00–10:00`, original placements and deadlines, resource IDs/capacities, and the case-specific C train bands and deadline. Independently derive and assert these exact future slots from the encoded train reservations:

| Possession | Legal slots |
|---|---|
| A | `09:00–09:45`, `10:00–10:45` |
| B | `10:00–10:45`, `11:00–11:45` |
| U | `10:00–10:45`, `12:00–12:45` |
| C, Case 2 | `11:00–11:45`, `12:00–12:45` |
| C, Case 3 | `11:00–11:45` only |

The script must read the generated fixture files, not import `expected_*` values as its source of truth. Run it before the golden recovery suite so a mistyped but plausible fixture fails immediately.

## Benchmark baseline

“FULL recovery” means the repository's existing full reoptimization recovery path, updated to obey the shared Phase 0–2 execution, membership, service-floor, and validation contracts. Reuse the same `optimize_schedule()` model and objective as restricted recovery, releasing all eligible future possessions by omitting complement-fixing constraints. Do not build a second solver or use the non-integrated planning comparison as the recovery baseline.

Keep P0B second for its independent priority evidence. Defer SQLite/SQLAlchemy while the in-memory, single-worker version counter can enforce `STALE_PLAN`/HTTP 409; document the single-worker limit.
