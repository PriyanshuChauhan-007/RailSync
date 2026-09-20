"""Materialize the synthetic golden fixtures specified in the P0 master PDF."""

from copy import deepcopy
from datetime import date
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "optimizer" / "fixtures" / "golden_recovery"
DAY = date(2026, 9, 21).isoformat()


def at(clock):
    return f"{DAY}T{clock}:00+05:30"


def task(task_id, department, section, crew, machine=None, *, deadline=None,
         footprint=None, requires_power=False, required=True):
    row = dict(task_id=task_id, department=department, section_id=section,
               duration_minutes=35, criticality=5, urgency=5, overdue_days=0,
               crew_type=crew, required=required,
               compatibility_group="U_GROUP" if task_id.startswith("U_") else task_id)
    if machine:
        row["machine_type"] = machine
    if deadline:
        row["deadline"] = at(deadline)
    if footprint:
        row["possession_footprint"] = footprint
    if requires_power:
        row["requires_power_isolation"] = True
    return row


def block(block_id, section, first, last, tasks, *, status="APPROVED", integrated=False,
          footprint=None):
    row = dict(block_id=block_id, section_id=section, start_time=at(first),
               end_time=at(last), tasks=tasks, integrated=integrated,
               status=status, locked=False)
    if footprint:
        row.update(section_ids=footprint["section_ids"],
                   capacity_resource_ids=footprint["capacity_resource_ids"])
    return row


def occupancy(section, bands):
    return [dict(train_id=f"T_{section}_{index}", section_id=section,
                 entry_time=at(first), exit_time=at(last))
            for index, (first, last) in enumerate(bands, 1)]


SECTIONS = [
    ("S_A", 0, "TRK_A"), ("S_N0", 0.5, "TRK_N0"),
    ("S_N1", 0.8, "TRK_N1"), ("S_C", 4, "TRK_C"),
    ("S_I", 6, "TRK_I"), ("S_H", 7, "TRK_H"),
    ("S_B", 12, "TRK_B"),
]
U_FOOTPRINT = {"section_ids": ["S_N0", "S_N1"],
               "capacity_resource_ids": ["TRK_N0", "TRK_N1"]}
BASE_BANDS = {
    "S_A": [("08:00", "08:55"), ("09:50", "09:55"), ("10:50", "14:00")],
    "S_B": [("08:00", "09:55"), ("10:50", "10:55"), ("11:50", "14:00")],
    "S_N0": [("08:00", "09:55"), ("10:50", "11:55"), ("12:50", "14:00")],
    "S_N1": [("08:00", "09:55"), ("10:50", "11:55"), ("12:50", "14:00")],
    "S_I": [("10:05", "14:00")],
    "S_H": [("08:50", "14:00")],
}


def common():
    tasks = [
        task("U_ST", "S&T", "S_N0", "U_ST_CREW", footprint=U_FOOTPRINT,
             deadline="12:45"),
        task("U_TRD", "TRD", "S_N0", "U_TRD_CREW", footprint=U_FOOTPRINT,
             deadline="12:45", requires_power=True),
        task("I_ENG", "ENGINEERING", "S_I", "I_CREW", "M_ACTIVE", required=False),
        task("H_ST", "S&T", "S_H", "H_CREW", required=False),
    ]
    blocks = [
        block("P_U", "S_N0", "10:00", "10:45", ["U_ST", "U_TRD"],
              integrated=True, footprint=U_FOOTPRINT),
        block("P_I", "S_I", "08:30", "09:15", ["I_ENG"], status="IN_PROGRESS"),
        block("P_H", "S_H", "08:00", "08:45", ["H_ST"], status="COMPLETED"),
    ]
    blocks[1].update(actual_start_time=at("08:35"),
                     remaining_minutes_by_task={"I_ENG": 30},
                     remaining_handback_minutes=30)
    blocks[2].update(actual_start_time=at("08:00"), actual_end_time=at("08:45"))
    bands = deepcopy(BASE_BANDS)
    return dict(
        provenance="SYNTHETIC_GOLDEN_RECOVERY_FIXTURE",
        horizon_start=at("08:00"), horizon_end=at("14:00"),
        snapshot_as_of=at("09:00"), parent_plan_version=7, world_state_revision=11,
        allowances=dict(safety_after_minutes=5, safety_before_minutes=5,
                        setup_minutes=5, release_minutes=5),
        sections=[dict(section_id=section, km=km,
                       capacity_resource_ids=[resource]) for section, km, resource in SECTIONS],
        maintenance_tasks=tasks, parent_blocks=blocks,
        train_occupancy=[row for section, rows in bands.items()
                         for row in occupancy(section, rows)],
        resources=dict(
            crew_capacities={pool: 1 for pool in
                             ("U_ST_CREW", "U_TRD_CREW", "I_CREW", "H_CREW")},
            machine_capacities={"M_ACTIVE": 1},
            crew_windows={}, machine_windows={},
            power_windows={section: [
                dict(start_time=at(a), end_time=at(b)) for a, b in
                (("09:55", "10:50"), ("11:55", "12:50"))]
                for section in ("S_N0", "S_N1")},
        ),
    )


def case(number):
    result = common()
    result["fixture_id"] = (
        "golden_01_shared_machine", "golden_02_resource_expansion",
        "golden_03_no_service_floor")[number - 1]
    result["maintenance_tasks"].extend([
        task("A_ENG", "ENGINEERING", "S_A", "A_CREW", "M_SHARED", deadline="10:45"),
        task("B_ENG", "ENGINEERING", "S_B",
             "PROTECTION_R" if number >= 2 else "B_CREW", "M_SHARED",
             deadline="11:45"),
    ])
    result["parent_blocks"].extend([
        block("P_A", "S_A", "09:00", "09:45", ["A_ENG"]),
        block("P_B", "S_B", "10:00", "10:45", ["B_ENG"]),
    ])
    result["resources"]["crew_capacities"].update(
        A_CREW=1, **({"PROTECTION_R": 1} if number >= 2 else {"B_CREW": 1}))
    result["resources"]["machine_capacities"]["M_SHARED"] = 1
    if number >= 2:
        result["maintenance_tasks"].append(task(
            "C_ST", "S&T", "S_C", "PROTECTION_R",
            deadline="12:45" if number == 2 else "11:45"))
        result["parent_blocks"].append(
            block("P_C", "S_C", "11:00", "11:45", ["C_ST"]))
        bands = ([("08:00", "10:55"), ("11:50", "11:55"), ("12:50", "14:00")]
                 if number == 2 else
                 [("08:00", "10:55"), ("11:50", "14:00")])
        result["train_occupancy"].extend(occupancy("S_C", bands))
    result["disruption"] = dict(
        event_id="GE_MACHINE_01", type="MACHINE_UNAVAILABLE",
        machine_type="M_SHARED", start_time=at("09:00"),
        end_time=at("10:00"), effective_time=at("09:00"),
    )
    return result


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / "common.json").write_text(json.dumps(common(), indent=2) + "\n", encoding="utf-8")
    names = ("case_01_shared_machine.json", "case_02_resource_expansion.json",
             "case_03_no_service_floor.json")
    for number, name in enumerate(names, 1):
        (ROOT / name).write_text(json.dumps(case(number), indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
