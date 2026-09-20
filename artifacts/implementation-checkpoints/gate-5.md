# Gate 5 — resource dependency graph

Status: PASSED on 2026-09-20. Branch `codex/sih-finalization`, HEAD `21bdb6f8fcdc25aa5e45e1f2d32088d77ef19404`.

New files: `optimizer/recovery_graph.py`, `optimizer/test_recovery_graph.py`. Files changed: `optimizer/recovery.py`.

Verification: `.venv\Scripts\python.exe -m pytest -q optimizer/test_recovery_graph.py -p no:cacheprovider --tb=short` → 2 passed, 0 failed. Full regression → 408 passed, 0 failed, 2 warnings.

The graph uses shared modeled track/crew/machine resources with overlapping reachable windows, plus explicit task dependencies. It selects whole possessions. Geography alone never creates adjacency. Case 1 seed P_A reaches P_B through M_SHARED while P_U stays outside LOCAL.

Limitation: NetworkX was unavailable in the local environment and installation was denied by network sandboxing. The graph uses a small standard-library adjacency representation with the same required selection semantics. CP-SAT and independent validation remain feasibility authorities. Next gate: bounded escalation.
