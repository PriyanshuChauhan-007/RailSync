"""Independent literal audit of generated fixture JSON against the PDF values."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "optimizer/fixtures/golden_recovery"


def at(clock):
    return f"2026-09-21T{clock}:00+05:30"


def load(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def bands(fixture, section):
    return [(row["entry_time"], row["exit_time"])
            for row in fixture["train_occupancy"] if row["section_id"] == section]


def expected(pairs):
    return [(at(a), at(b)) for a, b in pairs]


def verify():
    names = ("case_01_shared_machine.json", "case_02_resource_expansion.json",
             "case_03_no_service_floor.json")
    for number, name in enumerate(names, 1):
        fixture = load(name)
        assert fixture["provenance"] == "SYNTHETIC_GOLDEN_RECOVERY_FIXTURE"
        assert (fixture["horizon_start"], fixture["horizon_end"], fixture["snapshot_as_of"]) == (
            at("08:00"), at("14:00"), at("09:00"))
        assert (fixture["parent_plan_version"], fixture["world_state_revision"]) == (7, 11)
        assert fixture["allowances"] == dict(safety_after_minutes=5, safety_before_minutes=5,
                                               setup_minutes=5, release_minutes=5)
        assert bands(fixture, "S_A") == expected([
            ("08:00", "08:55"), ("09:50", "09:55"), ("10:50", "14:00")])
        assert bands(fixture, "S_B") == expected([
            ("08:00", "09:55"), ("10:50", "10:55"), ("11:50", "14:00")])
        for section in ("S_N0", "S_N1"):
            assert bands(fixture, section) == expected([
                ("08:00", "09:55"), ("10:50", "11:55"), ("12:50", "14:00")])
        if number >= 2:
            assert bands(fixture, "S_C") == expected(
                [("08:00", "10:55"), ("11:50", "11:55"), ("12:50", "14:00")]
                if number == 2 else [("08:00", "10:55"), ("11:50", "14:00")])
        parent = {row["block_id"]: row for row in fixture["parent_blocks"]}
        assert [(parent[key]["start_time"], parent[key]["end_time"]) for key in
                ("P_A", "P_B", "P_U", "P_I", "P_H")] == expected([
                    ("09:00", "09:45"), ("10:00", "10:45"),
                    ("10:00", "10:45"), ("08:30", "09:15"),
                    ("08:00", "08:45")])
        assert parent["P_I"]["actual_start_time"] == at("08:35")
        assert parent["P_I"]["remaining_minutes_by_task"] == {"I_ENG": 30}
        assert parent["P_H"]["actual_end_time"] == at("08:45")
        assert fixture["disruption"]["event_id"] == "GE_MACHINE_01"
        assert (fixture["disruption"]["start_time"], fixture["disruption"]["end_time"]) == (
            at("09:00"), at("10:00"))
        tasks = {row["task_id"]: row for row in fixture["maintenance_tasks"]}
        assert tasks["A_ENG"]["deadline"] == at("10:45")
        assert tasks["B_ENG"]["deadline"] == at("11:45")
        assert all(row["duration_minutes"] == 35 for row in tasks.values())
        if number >= 2:
            assert tasks["C_ST"]["deadline"] == at("12:45" if number == 2 else "11:45")
            assert tasks["B_ENG"]["crew_type"] == tasks["C_ST"]["crew_type"] == "PROTECTION_R"
    return len(names)


if __name__ == "__main__":
    print(f"Verified {verify()} golden JSON fixtures against literal spec constants.")
