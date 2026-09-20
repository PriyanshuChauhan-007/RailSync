# Gate 9 — evidence export

Status: PASSED on 2026-09-20. Branch `codex/sih-finalization`, HEAD `21bdb6f8fcdc25aa5e45e1f2d32088d77ef19404`.

New file: `scripts/render_golden_recovery_evidence.py`. Evidence: `artifacts/golden-recovery/manifest.json`, `runs.jsonl`, `summary.csv`, `summary.md`, `reference-solutions/`, `traces/`, `validation-reports/`, `test-results.txt`, and `figures/case-01-hero.png`, `case-02-expansion.png`, `case-03-honest-failure.png`.

Verification: three PNG figures rendered from saved reference plans and traces, with visible `SYNTHETIC_GOLDEN_RECOVERY_FIXTURE` label; one figure visually inspected. Full regression recorded in `test-results.txt`: 408 passed, 0 failed, 2 dependency deprecation warnings. `git diff --check` exit 0.

Limitations: figure 3 correctly has no recovered candidate and plots the parent plus actual failure trace. The current worktree had substantial pre-existing uncommitted user changes; no mixed commit or push was made. Next action: review the scoped checkpoint diff and integrate only intended code/evidence files.

Recoverability patch: `gates-3-9-working-tree.patch` (reverse-check passed). It covers the relevant backend/optimizer tracked-file differences plus new code/fixture/docs files. Some tracked-file hunks predate this implementation, so review them before applying elsewhere. PNG evidence remains in `artifacts/golden-recovery/figures/` and is not represented in the text patch.
