"""Load and execute the synthetic golden recovery fixtures."""

import json
from datetime import timedelta
from pathlib import Path

from .candidate_windows import OperationalAllowances, generate_footprint_windows
from .capacity import normalize_tasks
from .feasibility import evaluate_task_in_window
from .recovery import recover_schedule, recover_with_escalation
from .recovery_validation import validate_complete_plan
from .resources import PowerWindow, ResourceContext
from .time_utils import parse_datetime


FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "golden_recovery"
CASES = (
    "case_01_shared_machine.json", "case_02_resource_expansion.json",
    "case_03_no_service_floor.json",
)


def load_fixture(name):
    fixture = json.loads((FIXTURE_ROOT / name).read_text(encoding="utf-8"))
    source = {key: fixture[key] for key in
              ("sections", "maintenance_tasks", "train_occupancy")}
    config = fixture["resources"]
    resources = ResourceContext(
        crew_capacities=config["crew_capacities"],
        machine_capacities=config["machine_capacities"],
        crew_windows={pool: tuple(PowerWindow(**window) for window in windows)
                      for pool, windows in config.get("crew_windows", {}).items()},
        machine_windows={pool: tuple(PowerWindow(**window) for window in windows)
                         for pool, windows in config.get("machine_windows", {}).items()},
        power_windows={section: tuple(PowerWindow(**window) for window in windows)
                       for section, windows in config.get("power_windows", {}).items()},
    )
    allowances = OperationalAllowances(**fixture["allowances"])
    return fixture, source, resources, allowances


def derived_start_domains(fixture, source, resources, allowances):
    """Return legal starts from real occupancy/protection/resource calculations."""
    tasks = normalize_tasks(source["maintenance_tasks"], source["sections"])
    windows = generate_footprint_windows(
        source["train_occupancy"], [dict(section_id=task["section_id"],
            section_ids=task["_section_ids"],
            capacity_resource_ids=task["_capacity_resource_ids"]) for task in tasks],
        source["sections"], fixture["horizon_start"], fixture["horizon_end"], allowances,
    )
    domains = {}
    for task in tasks:
        starts = set()
        for window in windows:
            if window.footprint_id != task["_footprint_id"]:
                continue
            result = evaluate_task_in_window(task, window, allowances=allowances,
                                             resource_context=resources)
            for left, right in result.start_ranges:
                cursor, limit = parse_datetime(left), parse_datetime(right)
                while cursor <= limit:
                    starts.add(cursor.isoformat())
                    cursor += timedelta(minutes=1)
        domains[task["task_id"]] = sorted(starts)
    return domains


def run_case(name, *, time_limit_seconds=30, method="RESTRICTED"):
    fixture, source, resources, allowances = load_fixture(name)
    parent_validation = validate_complete_plan(
        source, fixture["parent_blocks"], fixture["horizon_start"],
        fixture["horizon_end"], resources=resources, allowances=allowances,
        snapshot_as_of=fixture["snapshot_as_of"], unscheduled_task_ids=[],
    )
    if not parent_validation.valid:
        raise ValueError(f"Golden parent invalid: {parent_validation.as_dict()}")
    if method == "RESTRICTED":
        return recover_with_escalation(
            source, fixture["parent_blocks"], fixture["disruption"],
            fixture["horizon_start"], fixture["horizon_end"],
            resource_context=resources, allowances=allowances,
            snapshot_as_of=fixture["snapshot_as_of"],
            time_limit_seconds=time_limit_seconds,
        )
    if method == "FULL":
        return recover_schedule(
            source, fixture["parent_blocks"], fixture["disruption"],
            fixture["horizon_start"], fixture["horizon_end"],
            resource_context=resources, allowances=allowances,
            snapshot_as_of=fixture["snapshot_as_of"],
            time_limit_seconds=time_limit_seconds,
        )
    raise ValueError(f"Unknown method: {method}")
