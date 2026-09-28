"""Executable golden reference suite from the synthetic P0 PDF fixtures."""

from copy import deepcopy

import pytest

from optimizer.golden_recovery import CASES, derived_start_domains, load_fixture, run_case
from optimizer.recovery import apply_disruption
from optimizer.recovery_validation import validate_complete_plan, _signature


def at(clock):
    return f"2026-09-21T{clock}:00+05:30"


@pytest.mark.parametrize("name", CASES)
def test_golden_parent_plan_validates(name):
    fixture, source, resources, allowances = load_fixture(name)
    report = validate_complete_plan(source, fixture["parent_blocks"],
        fixture["horizon_start"], fixture["horizon_end"], resources=resources,
        allowances=allowances, snapshot_as_of=fixture["snapshot_as_of"],
        unscheduled_task_ids=[])
    assert report.valid, report.as_dict()


@pytest.mark.parametrize("index", range(3))
def test_golden_train_windows_match_declared_slots(index):
    fixture, source, resources, allowances = load_fixture(CASES[index])
    domains = derived_start_domains(fixture, source, resources, allowances)
    assert domains["A_ENG"] == [at("09:00"), at("10:00")]
    assert domains["B_ENG"] == [at("10:00"), at("11:00")]
    assert domains["U_TRD"] == [at("10:00"), at("12:00")]
    assert domains["U_ST"] == [at("10:00"), at("12:00")]
    if index >= 1:
        assert domains["C_ST"] == ([at("11:00"), at("12:00")]
                                    if index == 1 else [at("11:00")])


def test_golden_outage_is_bounded_idempotent_and_inputs_immutable():
    fixture, source, resources, _ = load_fixture(CASES[0])
    original = deepcopy(source)
    changed, limited, _ = apply_disruption(
        source, resources, fixture["disruption"],
        fixture["horizon_start"], fixture["horizon_end"])
    assert source == original
    assert limited.machine_outages["M_SHARED"][0].start_time == at("09:00")
    assert limited.machine_outages["M_SHARED"][0].end_time == at("10:00")
    repeated, repeated_resources, _ = apply_disruption(
        changed, limited, fixture["disruption"],
        fixture["horizon_start"], fixture["horizon_end"])
    assert repeated == changed
    assert repeated_resources == limited


def test_golden_case_1_shared_machine_hero():
    fixture, _, _, _ = load_fixture(CASES[0])
    result = run_case(CASES[0])
    assert (result["status"], result["tier"], result["seed_block_ids"]) == (
        "success", "LOCAL", ["P_A"])
    assert result["attempts"][0]["mutable_block_ids"] == ["P_A", "P_B"]
    assert len(result["attempts"]) == 1
    blocks = {block["block_id"]: block for block in result["plan"]["blocks"]}
    parent = {block["block_id"]: block for block in fixture["parent_blocks"]}
    assert blocks["P_A"]["start_time"] == at("10:00")
    assert blocks["P_B"]["start_time"] == at("11:00")
    assert _signature(blocks["P_U"]) == _signature(parent["P_U"])
    assert blocks["P_I"] == parent["P_I"]
    assert blocks["P_H"] == parent["P_H"]
    assert result["plan"]["unscheduled_tasks"] == []
    assert result["diagnostics"]["complete_validation"]["valid"]


def test_golden_case_2_requires_one_expansion():
    result = run_case(CASES[1])
    assert (result["status"], result["tier"], result["seed_block_ids"]) == (
        "success", "EXPANDED", ["P_A"])
    assert [(attempt["tier"], attempt["status"]) for attempt in result["attempts"]] == [
        ("LOCAL", "INFEASIBLE"), ("EXPANDED", "VALIDATED")]
    assert result["attempts"][1]["mutable_block_ids"] == ["P_A", "P_B", "P_C"]
    starts = {block["block_id"]: block["start_time"] for block in result["plan"]["blocks"]}
    assert {key: starts[key] for key in ("P_A", "P_B", "P_C", "P_U")} == {
        "P_A": at("10:00"), "P_B": at("11:00"),
        "P_C": at("12:00"), "P_U": at("10:00")}
    assert result["plan"]["unscheduled_tasks"] == []
    assert result["diagnostics"]["complete_validation"]["valid"]


def test_golden_case_3_full_proven_infeasible_without_candidate():
    result = run_case(CASES[2])
    assert result["status"] == "INFEASIBLE"
    assert result["plan"] is None
    assert result["validation_status"] == "NOT_RUN_NO_CANDIDATE"
    assert [(attempt["tier"], attempt["status"]) for attempt in result["attempts"]] == [
        ("LOCAL", "INFEASIBLE"), ("EXPANDED", "INFEASIBLE"),
        ("FULL_TERRITORY", "INFEASIBLE")]


def test_golden_invalid_crew_overlap_is_rejected():
    fixture, source, resources, allowances = load_fixture(CASES[1])
    parent = deepcopy(fixture["parent_blocks"])
    for block in parent:
        if block["block_id"] == "P_B":
            block["start_time"], block["end_time"] = at("11:00"), at("11:45")
    report = validate_complete_plan(source, parent, fixture["horizon_start"],
        fixture["horizon_end"], resources=resources, allowances=allowances,
        snapshot_as_of=fixture["snapshot_as_of"])
    assert any(item.code == "CREW_CAPACITY_EXCEEDED" and
               set(item.involved_tasks) == {"B_ENG", "C_ST"}
               for item in report.violations)
