# Gate 6 — bounded escalation

Status: PASSED on 2026-09-20. Branch `codex/sih-finalization`, HEAD `21bdb6f8fcdc25aa5e45e1f2d32088d77ef19404`.

Files changed: `optimizer/recovery.py`, `backend/recovery_service.py`, `backend/schemas.py`, `backend/test_recovery_api.py`. New file: `optimizer/test_recovery_escalation.py`.

Verification: `.venv\Scripts\python.exe -m pytest -q optimizer/test_recovery_escalation.py -p no:cacheprovider --tb=short` → 1 passed, 0 failed. Full regression → 408 passed, 0 failed, 2 warnings.

LOCAL, EXPANDED, and FULL_TERRITORY are attempted in order with duplicate scopes skipped. Proven infeasibility, no incumbent, permitted future-feasibility validator rejection, and service-floor failure may escalate. Execution, identity, fixed-complement, malformed input, and model invalidity stop rather than expand. The first validated service-floor candidate returns; absent candidates are never adoptable. Backend preview exposes selected tier and attempts.

Limitation: a total deadline can end escalation before FULL; this is reported as NO_INCUMBENT rather than INFEASIBLE. Next gate: executable golden fixtures.
