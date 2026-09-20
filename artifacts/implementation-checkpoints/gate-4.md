# Gate 4 — restricted CP-SAT

Status: PASSED on 2026-09-20. Branch `codex/sih-finalization`, HEAD `21bdb6f8fcdc25aa5e45e1f2d32088d77ef19404`.

Files changed: `optimizer/optimizer.py`, `optimizer/recovery.py`. New file: `optimizer/test_restricted_recovery.py`.

Verification: `.venv\Scripts\python.exe -m pytest -q optimizer/test_restricted_recovery.py -p no:cacheprovider --tb=short` → 1 passed, 0 failed. Full regression → 408 passed, 0 failed, 2 warnings.

The existing CP-SAT model now fixes presence/start for the outside-scope future complement, fixes absence for originally absent tasks, and constrains original possession membership. Required work is a hard presence constraint. The merged complete plan passes the independent validator. FULL releases all eligible future decisions through the same recovery model.

Limitations: this is a constrained recovery model, so genuinely infeasible fixed complements require escalation. No new resource reassignment or rebundling is permitted. No commit was made because tracked files overlap pre-existing dirty edits. Next gate: resource graph.
