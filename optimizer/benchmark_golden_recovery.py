"""Fair FULL versus scoped recovery measurements on synthetic goldens."""

import csv
import json
from pathlib import Path
from statistics import median
from time import perf_counter

import ortools

from .golden_recovery import CASES, load_fixture, run_case
from .recovery import plan_changes


ROOT = Path(__file__).resolve().parents[1] / "artifacts" / "golden-recovery"


def _run(name, method, budget):
    started = perf_counter()
    try:
        result = run_case(name, time_limit_seconds=budget, method=method)
        if method == "FULL":
            status = "VALIDATED_SUCCESS" if result["diagnostics"]["complete_validation"]["valid"] else "ERROR"
        else:
            status = ("VALIDATED_SUCCESS" if result["status"] == "success" else
                      result["status"])
    except RuntimeError as error:
        result = None
        status = ("INFEASIBLE" if str(error).endswith("infeasible") else
                  "NO_INCUMBENT" if str(error).endswith("unknown") else "ERROR")
    except Exception as error:
        result = None
        status = "ERROR"
    elapsed = perf_counter() - started
    fixture, _, _, _ = load_fixture(name)
    parent = fixture["parent_blocks"]
    future = [block for block in parent if block.get("status") not in {"COMPLETED", "IN_PROGRESS"}]
    required = {task["task_id"] for task in fixture["maintenance_tasks"] if task.get("required")}
    row = dict(case=fixture["fixture_id"], method=method, budget_seconds=budget,
               end_to_end_seconds=elapsed, outcome=status,
               required_requested=len(required), required_scheduled=None,
               required_missing_ids=None, unchanged_future_possessions=None,
               future_possession_denominator=len(future),
               total_start_displacement_minutes=None,
               maximum_start_displacement_minutes=None,
               tier_reached=None, mutable_count=None, mutable_fraction=None,
               attempt_count=None, proof_state=None, last_proven_stage=None,
               solver_status=None, validation_status="NOT_RUN_NO_CANDIDATE",
               snapshot_preparation_seconds=None, scope_seconds=None,
               model_build_seconds=None, solve_seconds=None,
               merge_seconds=None, validation_seconds=None)
    if result is not None and status == "VALIDATED_SUCCESS":
        plan = result["plan"]
        scheduled = {task_id for block in plan["blocks"] for task_id in block["tasks"]}
        changes = plan_changes(parent, plan["blocks"])
        shifts = [item["shift_minutes"] or 0 for item in changes["task_changes"]]
        row.update(required_scheduled=len(required & scheduled),
                   required_missing_ids=sorted(required - scheduled),
                   unchanged_future_possessions=sum(item["state"] == "RETAINED"
                        for item in changes["block_changes"] if item["before_block_id"]
                        in {block["block_id"] for block in future}),
                   total_start_displacement_minutes=sum(shifts),
                   maximum_start_displacement_minutes=max(shifts, default=0),
                   tier_reached=result.get("tier", "FULL_TERRITORY"),
                   attempt_count=len(result.get("attempts", [])) or 1,
                   proof_state=result["diagnostics"].get("proof_state"),
                   last_proven_stage=result["diagnostics"].get("solution_stage"),
                   solver_status=result["diagnostics"]["priority_stages"][0]["solver_status"],
                   validation_status="PASS")
        mutable = (next((attempt["mutable_block_ids"] for attempt in result.get("attempts", [])
                         if attempt["status"] == "VALIDATED"),
                        [block["block_id"] for block in future]))
        row["mutable_count"] = len(mutable)
        row["mutable_fraction"] = len(mutable) / len(future) if future else 0
        facts = result["diagnostics"]
        row.update(snapshot_preparation_seconds=facts.get("snapshot_preparation_seconds"),
                   scope_seconds=facts.get("scope_seconds", 0.0 if method == "FULL" else None),
                   model_build_seconds=facts.get("model_build_seconds"),
                   solve_seconds=facts.get("solver_seconds"),
                   merge_seconds=facts.get("merge_seconds"),
                   validation_seconds=(facts.get("independent_validation_seconds", 0)
                                       + facts.get("recovery_validation_seconds", 0)))
    elif result is not None:
        row.update(tier_reached=result["attempts"][-1]["tier"] if result["attempts"] else None,
                   attempt_count=len(result["attempts"]),
                   solver_status=result["attempts"][-1].get("solver_status") if result["attempts"] else None)
    return row, result


def benchmark():
    ROOT.mkdir(parents=True, exist_ok=True)
    for name in ("reference-solutions", "traces", "validation-reports", "figures"):
        (ROOT / name).mkdir(exist_ok=True)
    manifest = dict(provenance="SYNTHETIC_GOLDEN_RECOVERY_FIXTURE",
                    solver="OR-Tools CP-SAT", solver_version=ortools.__version__,
                    workers=1, seed=42, hints="disabled", reference_budget_seconds=30,
                    timed_budget_seconds=5, warmups_per_method_case=1,
                    measured_repetitions_per_method_case=5,
                    order="alternating FULL/RESTRICTED by repetition",
                    full_definition="existing recover_schedule full reoptimization path",
                    restricted_definition="same recover_schedule and model with fixing constraints")
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    runs = []
    for name in CASES:
        fixture, _, _, _ = load_fixture(name)
        for method in ("FULL", "RESTRICTED"):
            row, result = _run(name, method, 30)
            reference = dict(row=row, plan=result.get("plan") if result else None)
            (ROOT / "reference-solutions" / f"{fixture['fixture_id']}-{method.lower()}.json").write_text(
                json.dumps(reference, indent=2, default=str) + "\n", encoding="utf-8")
            (ROOT / "validation-reports" / f"{fixture['fixture_id']}-{method.lower()}.json").write_text(
                json.dumps(result["diagnostics"]["complete_validation"] if result and result.get("diagnostics")
                           else {"status": "NOT_RUN_NO_CANDIDATE"}, indent=2) + "\n", encoding="utf-8")
            if result and result.get("attempts"):
                (ROOT / "traces" / f"{fixture['fixture_id']}-{method.lower()}.json").write_text(
                    json.dumps(result["attempts"], indent=2) + "\n", encoding="utf-8")
            _run(name, method, 5)  # Unmeasured warmup at the timed-run budget.
        for repetition in range(5):
            order = ("FULL", "RESTRICTED") if repetition % 2 == 0 else ("RESTRICTED", "FULL")
            for method in order:
                row, _ = _run(name, method, 5)
                row["repetition"] = repetition + 1
                runs.append(row)
    with (ROOT / "runs.jsonl").open("w", encoding="utf-8") as stream:
        for row in runs:
            stream.write(json.dumps(row, sort_keys=True) + "\n")
    summary = []
    for name in CASES:
        fixture, _, _, _ = load_fixture(name)
        for method in ("FULL", "RESTRICTED"):
            group = [row for row in runs if row["case"] == fixture["fixture_id"]
                     and row["method"] == method]
            latencies = [row["end_to_end_seconds"] for row in group]
            summary.append(dict(case=fixture["fixture_id"], method=method,
                                outcomes=";".join(row["outcome"] for row in group),
                                median_seconds=median(latencies),
                                min_seconds=min(latencies), max_seconds=max(latencies),
                                measured_runs=len(group)))
    with (ROOT / "summary.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(summary[0]))
        writer.writeheader()
        writer.writerows(summary)
    lines = ["# Synthetic golden recovery benchmark", "",
             "Provenance: SYNTHETIC_GOLDEN_RECOVERY_FIXTURE.",
             "Five measured runs per method and case, one warmup. Times are end-to-end seconds.",
             "No p95 estimate is claimed.", "",
             "| Case | Method | Outcomes | Median | Range |", "|---|---|---|---:|---:|"]
    for row in summary:
        lines.append(f"| {row['case']} | {row['method']} | {row['outcomes']} | "
                     f"{row['median_seconds']:.4f} | {row['min_seconds']:.4f}–{row['max_seconds']:.4f} |")
    full_faster = [case for case in {row["case"] for row in summary}
                   if next(item for item in summary if item["case"] == case and item["method"] == "FULL")["median_seconds"]
                   < next(item for item in summary if item["case"] == case and item["method"] == "RESTRICTED")["median_seconds"]]
    lines.extend(["", "FULL was faster by median end-to-end time in: " +
                  (", ".join(sorted(full_faster)) if full_faster else "none") + ".",
                  "These small synthetic fixtures do not establish a general speed advantage for selective recovery.",
                  "Detailed per-run outcome, scope, proof, and phase timing fields are in `runs.jsonl`."])
    (ROOT / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return summary


if __name__ == "__main__":
    for row in benchmark():
        print(row)
