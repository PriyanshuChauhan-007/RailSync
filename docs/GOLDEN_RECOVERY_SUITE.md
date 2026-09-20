# Golden recovery suite

These are synthetic proof fixtures, not live railway data. The source numbers are in
`optimizer/fixtures/golden_recovery/`. Run `scripts/verify_golden_fixture_constants.py`
before the solver tests; it independently checks literal timestamps, deadlines,
parent state, and outage bounds. `optimizer/test_golden_recovery.py` then derives
legal starts from train occupancy, protection margins, resources, and task duration.

## Recovery behavior

The same CP-SAT model serves FULL and restricted recovery. Restricted solves add
fixing constraints for every future possession outside the selected scope. Parent
membership stays fixed in either mode. Completed work is excluded from CP-SAT,
and active work reserves its explicit remaining infrastructure, crew, and machine
capacity. The independent complete-plan validator checks the merged output.

The scope graph uses a small standard-library adjacency representation because
NetworkX was not installed and package network access was unavailable in this
workspace. It connects possessions only through modeled shared capacity with
overlapping reachable windows or explicit task dependencies. Geographic proximity
never creates an edge. The graph selects scope; it does not prove feasibility.

| Case | Seed | Attempts | Result |
|---|---|---|---|
| Shared machine | P_A | LOCAL A+B | A 10:00, B 11:00; U unchanged |
| Resource expansion | P_A | LOCAL infeasible, EXPANDED A+B+C | A 10:00, B 11:00, C 12:00; U unchanged |
| No service floor | P_A | LOCAL, EXPANDED, FULL all proven infeasible | No candidate or adoptable proposal |

All future tasks in these fixtures are required. Solver presence is a hard
constraint. `UNKNOWN` and timeouts remain `NO_INCUMBENT`; only a CP-SAT
infeasibility proof is labeled `INFEASIBLE`. A validator rejection can trigger
expansion only when every violation is a future feasibility issue. Execution,
identity, fixed-complement, and model consistency failures stop recovery.

## Reproduce

From the repository root:

```powershell
.venv\Scripts\python.exe scripts\verify_golden_fixture_constants.py
.venv\Scripts\python.exe -m pytest -q optimizer/test_golden_recovery.py -p no:cacheprovider
.venv\Scripts\python.exe -m optimizer.benchmark_golden_recovery
```

The benchmark uses one CP-SAT worker, seed 42, no hints, the same 5-second
end-to-end budget per method/case, one unmeasured warmup, five measured runs,
and alternating FULL/RESTRICTED order. The 30-second reference runs use the
existing full recovery path as FULL. Results are in
`artifacts/golden-recovery/summary.md` and `runs.jsonl`. This tiny synthetic
suite does not demonstrate a general speed advantage: FULL wins on median
end-to-end time in Cases 2 and 3. Five runs do not support a p95 claim.

Figures are rendered from saved reference plans and traces with
`scripts/render_golden_recovery_evidence.py`, using the bundled Python Pillow
runtime. Case 3's figure shows the historical parent and measured failure trace,
because there is no valid recovered plan to draw.
