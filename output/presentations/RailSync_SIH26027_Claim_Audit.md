# RailSync SIH26027 — claim audit

The deck is a six-slide prototype presentation. Golden recovery cases are **SYNTHETIC_GOLDEN_RECOVERY_FIXTURE**, not Indian Railways field results. Paths below are relative to the RailSync repository unless noted. The Gate 9 evidence archive supplied by the user is the authority for experiment outcomes; the cited `artifacts/golden-recovery/` files are its matching working-copy evidence.

| Slide | Exact claim or displayed statement | Source | Classification |
|---|---|---|---|
| 1 | “RailSync”; “SIH26027”; “Transportation & Logistics”; “Software”; “TEAM NSUT082”; stated problem title and team members | User-supplied presentation brief; `RailSync_Codex_Reference_Pack.zip` official SIH template and problem materials | DESIGN INTENT |
| 1 | “Automatic block planning with controlled recovery” | Implemented planning and recovery documented in `README.md`, `docs/REOPTIMIZATION.md` | VERIFIED IMPLEMENTATION |
| 2 | “One workflow from maintenance demand to a reviewable block plan” | `README.md`; `docs/PRIORITY_ENGINE.md`; `optimizer/optimizer.py`; controller workflow in current worktree | VERIFIED IMPLEMENTATION |
| 2 | “MAINTENANCE requests + priority” and “PRIORITIZE explainable scoring” | `optimizer/priority.py`; `docs/PRIORITY_ENGINE.md`; `optimizer/test_priority.py` | VERIFIED IMPLEMENTATION |
| 2 | “TRAIN WINDOWS occupancy + protection”; “RESOURCES crew, machines, power”; “OPERATING RULES sections, setup, deadlines” | `optimizer/optimizer.py`; `docs/ASSUMPTIONS.md`; `docs/REOPTIMIZATION.md` | VERIFIED IMPLEMENTATION |
| 2 | “COORDINATE ENG / S&T / TRD” and “PLAN feasible possessions” | `README.md`; `optimizer/optimizer.py` | VERIFIED IMPLEMENTATION |
| 2 | “VALIDATE complete plan” | `optimizer/recovery_validation.py`; `docs/REOPTIMIZATION.md` | VERIFIED IMPLEMENTATION |
| 2 | “REVIEW controller decision” | Current worktree controller-facing workflow; `README.md` | VERIFIED IMPLEMENTATION |
| 2 | “Execution snapshot → resource-linked repair → complete-plan revalidation” | `optimizer/recovery.py`; `optimizer/recovery_graph.py`; `optimizer/recovery_validation.py` | VERIFIED IMPLEMENTATION |
| 2 | “Unaffected approved commitments stay fixed; scope expands only when dependencies require it” | `docs/GOLDEN_RECOVERY_SUITE.md`; `optimizer/recovery.py`; Gate 9 traces | VERIFIED IMPLEMENTATION |
| 3 | “A single constraint model; a separate complete-plan validator” | `docs/GOLDEN_RECOVERY_SUITE.md`; `optimizer/optimizer.py`; `optimizer/recovery_validation.py` | VERIFIED IMPLEMENTATION |
| 3 | “Priority”, “Windows”, “CP-SAT”, “Validator”, “Controller” initial-planning flow | `optimizer/priority.py`; `optimizer/optimizer.py`; `optimizer/recovery_validation.py`; `README.md` | VERIFIED IMPLEMENTATION |
| 3 | “Snapshot”, “Scope”, “CP-SAT fixed complement”, “Validator whole candidate”, “LOCAL → EXPANDED → FULL” recovery flow | `optimizer/recovery.py`; `optimizer/recovery_graph.py`; `docs/REOPTIMIZATION.md` | VERIFIED IMPLEMENTATION |
| 3 | “P_A — M_SHARED — P_B — PROTECTION_R — P_C”; “LOCAL A+B · INFEASIBLE”; “EXPANDED A+B+C · VALIDATED”; “5/5 required work retained” | `optimizer/fixtures/golden_recovery/case_02_resource_expansion.json`; `artifacts/golden-recovery/traces/golden_02_resource_expansion-restricted.json`; `artifacts/golden-recovery/reference-solutions/golden_02_resource_expansion-restricted.json` | SYNTHETIC EXPERIMENT |
| 3 | “Python · OR-Tools CP-SAT · FastAPI/Pydantic · React/Vite · pytest” | Current worktree dependency manifests, `README.md`, optimizer and API/frontend source | VERIFIED IMPLEMENTATION |
| 4 | “408 automated tests pass” | `artifacts/golden-recovery/test-results.txt` (408 passed, 2 dependency deprecation warnings) | VERIFIED IMPLEMENTATION |
| 4 | “11 / 11 golden recovery tests pass”; “3 / 3 fixture contracts verified” | `optimizer/test_golden_recovery.py`; `scripts/verify_golden_fixture_constants.py`; Gate 9 test/fixture verification evidence | VERIFIED IMPLEMENTATION |
| 4 | “Independent validation · execution-aware recovery”; “Stale proposal rejection” | `optimizer/recovery_validation.py`; `optimizer/recovery.py`; `docs/REOPTIMIZATION.md` | VERIFIED IMPLEMENTATION |
| 4 | “Same CP-SAT model for FULL and RESTRICTED” | `docs/GOLDEN_RECOVERY_SUITE.md`; `optimizer/recovery.py`; `optimizer/optimizer.py` | VERIFIED IMPLEMENTATION |
| 4 | “Authorized operational feeds and pilot rules”; “Production persistence and access control”; “Railway domain-expert validation”; “Corridor-scale benchmarking” | `docs/DATA_PROVENANCE.md`; `docs/ASSUMPTIONS.md`; current implementation scope | FUTURE WORK |
| 4 | “LOCAL → INFEASIBLE; EXPANDED → INFEASIBLE; FULL TERRITORY → INFEASIBLE”; “No adoptable repair; required work is not silently dropped” | `artifacts/golden-recovery/traces/golden_03_no_service_floor-restricted.json`; `artifacts/golden-recovery/reference-solutions/golden_03_no_service_floor-restricted.json`; `docs/GOLDEN_RECOVERY_SUITE.md` | SYNTHETIC EXPERIMENT |
| 4 | “Small synthetic fixtures validate behavior; they do not establish a general runtime advantage” | `artifacts/golden-recovery/summary.md`; five runs per method/case with FULL faster by median in Cases 2 and 3 | SYNTHETIC EXPERIMENT |
| 5 | “Plan better” through priority, coordination and hard constraints | `optimizer/priority.py`; `optimizer/optimizer.py`; `docs/PRIORITY_ENGINE.md` | DESIGN INTENT |
| 5 | “Change less” through scope, preservation and escalation | `optimizer/recovery.py`; `optimizer/recovery_graph.py`; Gate 9 traces | VERIFIED IMPLEMENTATION |
| 5 | “Fail safely” through independent validation, no invalid adoption and controller control | `optimizer/recovery_validation.py`; `optimizer/recovery.py`; controller workflow | VERIFIED IMPLEMENTATION |
| 5 | “P_A/P_B repaired; nearby independent P_U unchanged” | `artifacts/golden-recovery/traces/golden_01_shared_machine-restricted.json`; `reference-solutions/golden_01_shared_machine-restricted.json` | SYNTHETIC EXPERIMENT |
| 5 | “LOCAL infeasible → EXPANDED validated; 5/5 work retained” | Case 2 Gate 9 trace and reference solution cited above | SYNTHETIC EXPERIMENT |
| 5 | “No feasible service-floor repair; no candidate adopted” | Case 3 Gate 9 trace and reference solution cited above | SYNTHETIC EXPERIMENT |
| 5 | “408 automated tests passed across the current prototype” | `artifacts/golden-recovery/test-results.txt` | VERIFIED IMPLEMENTATION |
| 6 | Ministry of Railways / Smart India Hackathon · SIH26027 | User-supplied reference pack and SIH problem statement | EXTERNAL RESEARCH |
| 6 | Nygren, Eichenberger & Frejinger (2023), arXiv:2305.03574 | User-supplied research/reference pack | EXTERNAL RESEARCH |
| 6 | Albrecht, Panton & Lee (2013), DOI: 10.1016/j.cor.2010.09.001 | User-supplied research/reference pack | EXTERNAL RESEARCH |
| 6 | Yang et al. (2026), DOI: 10.1016/j.trc.2026.105781 | User-supplied research/reference pack | EXTERNAL RESEARCH |
| 6 | Google OR-Tools CP-SAT documentation | User-supplied brief; OR-Tools dependency in current implementation | EXTERNAL RESEARCH |
| 6 | GitHub and prototype addresses | User-supplied presentation brief; `README.md` | VERIFIED IMPLEMENTATION |

## Deliberate limits

- No claim of live Indian Railways integration, field validation, production readiness, safety certification, predictive maintenance, or NetworkX use.
- No invented delay, availability, cost or throughput improvement.
- No claim that restricted recovery is generally faster. The small synthetic benchmark has FULL faster by median in Cases 2 and 3.
- The PDF uses rendered slide images because native PowerPoint PDF export was unavailable in this session. The editable PPTX is the source deck.
