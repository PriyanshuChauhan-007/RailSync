# Synthetic golden recovery benchmark

Provenance: SYNTHETIC_GOLDEN_RECOVERY_FIXTURE.
Five measured runs per method and case, one warmup. Times are end-to-end seconds.
No p95 estimate is claimed.

| Case | Method | Outcomes | Median | Range |
|---|---|---|---:|---:|
| golden_01_shared_machine | FULL | VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS | 0.0706 | 0.0661–0.0758 |
| golden_01_shared_machine | RESTRICTED | VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS | 0.0653 | 0.0586–0.0664 |
| golden_02_resource_expansion | FULL | VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS | 0.0995 | 0.0928–0.1250 |
| golden_02_resource_expansion | RESTRICTED | VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS;VALIDATED_SUCCESS | 0.1085 | 0.0926–0.1186 |
| golden_03_no_service_floor | FULL | INFEASIBLE;INFEASIBLE;INFEASIBLE;INFEASIBLE;INFEASIBLE | 0.0192 | 0.0171–0.0207 |
| golden_03_no_service_floor | RESTRICTED | INFEASIBLE;INFEASIBLE;INFEASIBLE;INFEASIBLE;INFEASIBLE | 0.0601 | 0.0537–0.0629 |

FULL was faster by median end-to-end time in: golden_02_resource_expansion, golden_03_no_service_floor.
These small synthetic fixtures do not establish a general speed advantage for selective recovery.
Detailed per-run outcome, scope, proof, and phase timing fields are in `runs.jsonl`.
