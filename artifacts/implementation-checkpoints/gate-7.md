# Gate 7 — golden recovery suite

Status: PASSED on 2026-09-20. Branch `codex/sih-finalization`, HEAD `21bdb6f8fcdc25aa5e45e1f2d32088d77ef19404`.

New files: `optimizer/fixtures/golden_recovery/*.json`, `optimizer/golden_recovery.py`, `optimizer/test_golden_recovery.py`, `scripts/build_golden_fixtures.py`, `scripts/verify_golden_fixture_constants.py`, `docs/GOLDEN_RECOVERY_SUITE.md`.

Verification: `.venv\Scripts\python.exe scripts\verify_golden_fixture_constants.py` → 3 JSON fixtures verified. `.venv\Scripts\python.exe -m pytest -q optimizer/test_golden_recovery.py -p no:cacheprovider --tb=short` → 11 passed, 0 failed. Full regression → 408 passed, 0 failed, 2 warnings.

Derived legal starts: A 09:00/10:00, B 10:00/11:00, U 10:00/12:00, C Case 2 11:00/12:00, C Case 3 11:00. Case 1 LOCAL succeeds with A 10:00 and B 11:00, U unchanged. Case 2 LOCAL proves infeasible; EXPANDED succeeds with C 12:00. Case 3 LOCAL, EXPANDED, and FULL all prove infeasible with no candidate. A deliberate B/C overlap fails independent crew-capacity validation.

Limitation: these are synthetic golden examples, not a statistical field sample. Next gate: fair benchmark.
