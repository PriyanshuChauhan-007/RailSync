# Gate 8 — FULL versus RESTRICTED benchmark

Status: PASSED on 2026-09-20. Branch `codex/sih-finalization`, HEAD `21bdb6f8fcdc25aa5e45e1f2d32088d77ef19404`.

New file: `optimizer/benchmark_golden_recovery.py`. Files changed: `optimizer/optimizer.py`, `optimizer/recovery.py`, `optimizer/test_integration.py`. Evidence: `artifacts/golden-recovery/manifest.json`, `runs.jsonl`, `summary.csv`, `summary.md`, `reference-solutions/`, `traces/`, `validation-reports/`.

Verification: `.venv\Scripts\python.exe -m optimizer.benchmark_golden_recovery` → 30 measured runs, 6 unmeasured warmups, 6 reference runs; no benchmark errors. Full regression → 408 passed, 0 failed, 2 warnings.

Median end-to-end seconds, FULL versus RESTRICTED: Case 1 0.0706 vs 0.0653; Case 2 0.0995 vs 0.1085; Case 3 0.0192 vs 0.0601. FULL wins Cases 2 and 3. Outcomes: both methods validate Cases 1/2; both prove Case 3 infeasible. Five runs do not establish p95 or a general selective speed advantage. Next gate: evidence figures/export.
