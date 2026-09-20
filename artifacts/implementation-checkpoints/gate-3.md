# Gate 3 — execution-safe recovery

Status: PASSED on 2026-09-20. Branch `codex/sih-finalization`, HEAD `21bdb6f8fcdc25aa5e45e1f2d32088d77ef19404`.

Files changed: `optimizer/recovery.py`, `optimizer/resources.py`, `optimizer/possessions.py`, `optimizer/optimizer.py`, `optimizer/recovery_validation.py`, `backend/recovery_service.py`, `backend/operations_service.py`, `backend/main.py`, `backend/schemas.py`, affected recovery/API tests. New files: `optimizer/test_recovery_execution.py`, `backend/test_recovery_versioning.py`.

Verification: `.venv\Scripts\python.exe -m pytest -q optimizer/test_recovery_execution.py backend/test_recovery_versioning.py -p no:cacheprovider --tb=short` → 11 passed, 0 failed, 2 dependency deprecation warnings. Full regression at final checkpoint → 408 passed, 0 failed, 2 warnings. `git diff --check` exit 0.

Completed work: completed blocks are historical; active blocks reserve explicit remaining resources and never enter CP-SAT; unstarted reservations start at/after `snapshot_as_of`; missing actual facts and active outage conflicts fail explicitly. Bounded outages, power subtraction, completed train segments, and occupied train entry are preserved. Stable IDs and membership, parent revision/input digest, and stale adoption 409 are enforced. Solver `UNKNOWN` remains distinct from proven infeasibility.

Limitations: the repository has no persistent world-state database. Version/revision binding uses the existing in-memory registry. The worktree contained pre-existing changes, so no mixed commit was made. Next gate: restricted CP-SAT.
