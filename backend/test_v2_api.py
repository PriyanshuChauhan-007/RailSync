from copy import deepcopy
import base64
import html
import io
import zipfile

import pytest
from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)
TERRITORY = "western_hdn"


@pytest.fixture
def public_plan():
    response = client.post("/api/optimize", json={"territory_id": TERRITORY})
    assert response.status_code == 200, response.text
    return response.json()


def recovery_payload(plan, disruption):
    return {
        "territory_id": TERRITORY,
        "horizon_start": plan["planning_context"]["horizon_start"],
        "horizon_end": plan["planning_context"]["horizon_end"],
        "current_plan": {
            "blocks": deepcopy(plan["blocks"]),
            "unscheduled_tasks": plan["unscheduled_tasks"],
        },
        "disruption": disruption,
    }


def test_only_three_public_territories_are_shown_by_default():
    territories = client.get("/api/territories").json()["territories"]
    assert {item["territory_id"] for item in territories} == {
        "saktigarh_memari_public_demo", "western_hdn", "delhi_agra"
    }
    assert all(item["planning_ready"] for item in territories)


def test_public_plan_exposes_identity_alternatives_and_capacity(public_plan):
    assert public_plan["plan_identity"]["state"] == "DRAFT"
    assert len(public_plan["alternatives"]) == 2
    assert all(item["solver_derived"] if "solver_derived" in item else item["solver_backed"] for item in public_plan["alternatives"])
    assert any(len(block["section_ids"] or []) > 1 for block in public_plan["blocks"])
    assert all(block["capacity_resource_ids"] for block in public_plan["blocks"])


def test_operational_read_models_and_exports(public_plan):
    for path in ("rolling-plan", "resources", "alerts", "data-sources"):
        response = client.get(f"/api/{path}?territory_id={TERRITORY}")
        assert response.status_code == 200
    csv_response = client.post("/api/export/blocks.csv", json={"blocks": public_plan["blocks"]})
    assert csv_response.status_code == 200
    assert csv_response.text.startswith("block_id,section_ids,capacity_resources")
    report = client.post("/api/export/print", json={"blocks": public_plan["blocks"]})
    assert report.status_code == 200
    assert "Print this verified view to PDF" in report.text


def test_lifecycle_advances_one_controlled_state_at_a_time(public_plan):
    plan_id = public_plan["plan_identity"]["plan_id"]
    block_id = public_plan["blocks"][0]["block_id"]
    for target in ("FROZEN", "IN_PROGRESS", "COMPLETED"):
        execution = (
            {"actual_start_time": public_plan["blocks"][0]["start_time"],
             "remaining_minutes_by_task": {task_id: 10 for task_id in public_plan["blocks"][0]["tasks"]},
             "remaining_handback_minutes": 10}
            if target == "IN_PROGRESS" else
            {"actual_end_time": public_plan["blocks"][0]["end_time"]}
            if target == "COMPLETED" else None
        )
        response = client.post(
            f"/api/plans/{plan_id}/blocks/{block_id}/status",
            json={"target_status": target, "actor": "test", "execution": execution},
        )
        assert response.status_code == 200
        assert response.json()["status"] == target
    invalid_block = client.post(
        f"/api/plans/{plan_id}/blocks/{block_id}/status",
        json={"target_status": "FROZEN"},
    )
    assert invalid_block.status_code == 422

    for target in ("REVIEWED", "APPROVED", "PUBLISHED"):
        response = client.post(f"/api/plans/{plan_id}/transition", json={"target_state": target, "actor": "test"})
        assert response.status_code == 200
        assert response.json()["identity"]["state"] == target
    invalid = client.post(f"/api/plans/{plan_id}/transition", json={"target_state": "APPROVED"})
    assert invalid.status_code == 422


def test_what_if_copilot_explanation_and_import_are_real(public_plan):
    preview = client.post("/api/what-if", json={
        "territory_id": TERRITORY,
        "parent_plan_id": public_plan["plan_identity"]["plan_id"],
        "task_overrides": [{"task_id": "WR_ENG001", "duration_minutes": 25}],
    })
    assert preview.status_code == 200, preview.text
    assert preview.json()["permanent"] is False
    assert preview.json()["result"]["plan_identity"]["parent_plan_id"] == public_plan["plan_identity"]["plan_id"]
    block = public_plan["blocks"][0]
    assert client.post("/api/explain", json={"block": block}).json()["facts"]["tasks"] == block["tasks"]
    copilot = client.post("/api/copilot", json={
        "territory_id": TERRITORY,
        "question": "What if this runs longer?",
        "selected_block": block,
        "task_overrides": [{"task_id": "WR_ENG001", "duration_minutes": 25}],
    })
    assert copilot.status_code == 200
    assert copilot.json()["engine"] == "CP_SAT_WHAT_IF"
    imported = client.post("/api/import/tasks/validate", json={
        "territory_id": TERRITORY,
        "records": [{"task_id": "NEW", "department": "S&T", "section_id": "WR_SEC01", "task_type": "Inspection", "duration_minutes": 10}],
    })
    assert imported.json()["valid"] is True
    assert imported.json()["permanent"] is False


def test_excel_import_is_parsed_and_validated_without_persisting():
    headers = ["task_id", "department", "section_id", "task_type", "duration_minutes"]
    values = headers + ["XLSX_NEW", "S&T", "WR_SEC01", "Excel inspection", "10"]
    shared = "<sst xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'>" + "".join(f"<si><t>{html.escape(value)}</t></si>" for value in values) + "</sst>"
    sheet = "<worksheet xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'><sheetData><row r='1'>" + "".join(f"<c r='{chr(65+i)}1' t='s'><v>{i}</v></c>" for i in range(5)) + "</row><row r='2'>" + "".join(f"<c r='{chr(65+i)}2' t='s'><v>{5+i}</v></c>" for i in range(5)) + "</row></sheetData></worksheet>"
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as workbook:
        workbook.writestr("xl/sharedStrings.xml", shared)
        workbook.writestr("xl/worksheets/sheet1.xml", sheet)
    response = client.post("/api/import/tasks/validate", json={
        "territory_id": TERRITORY,
        "workbook_base64": base64.b64encode(stream.getvalue()).decode("ascii"),
    })
    assert response.status_code == 200, response.text
    assert response.json()["valid"] is True
    assert response.json()["preview"][0]["task_id"] == "XLSX_NEW"


@pytest.mark.parametrize("disruption", [
    {"type": "TRAIN_DELAY", "train_id": "93003", "delay_minutes": 12},
    {"type": "CREW_UNAVAILABLE", "crew_type": "OHE_CREW", "event_id": "V2_CREW",
     "start_time": "2026-09-10T06:00:00", "end_time": "2026-09-10T06:15:00"},
    {"type": "MACHINE_UNAVAILABLE", "machine_type": "TOWER_WAGON", "event_id": "V2_MACHINE",
     "start_time": "2026-09-10T06:00:00", "end_time": "2026-09-10T06:15:00"},
    {"type": "POWER_ISOLATION_CANCELLED", "section_ids": ["WR_SEC02"], "event_id": "V2_POWER",
     "start_time": "2026-09-10T06:00:00", "end_time": "2026-09-10T06:15:00"},
    {"type": "SECTION_UNAVAILABLE", "section_id": "WR_SEC03", "start_time": "2026-09-10T06:00:00", "end_time": "2026-09-10T08:00:00"},
    {"type": "WEATHER_RESTRICTION", "delay_minutes": 5, "train_ids": ["93001"]},
    {"type": "EMERGENCY_WORK", "task": {"task_id": "EMERGENCY_WR_SEC08", "department": "ENGINEERING", "section_id": "WR_SEC08", "task_type": "Emergency track inspection", "duration_minutes": 20, "criticality": 10, "urgency": 10, "overdue_days": 0, "deadline": "2026-09-10T10:30:00", "requires_power_block": False, "crew_type": "TRACK_CREW", "compatibility_group": "EMERGENCY_WR_SEC08"}},
])
def test_every_scenario_option_runs_a_real_recovery(public_plan, disruption):
    response = client.post("/api/reoptimize", json=recovery_payload(public_plan, disruption))
    assert response.status_code == 200, response.text
    assert response.json()["recovered_plan"]["status"] == "success"


def test_elapsed_work_without_actual_execution_is_rejected(public_plan):
    payload = recovery_payload(public_plan, {"type": "TRAIN_DELAY", "train_id": "93003", "delay_minutes": 0})
    first = payload["current_plan"]["blocks"][0]
    first["status"] = "COMPLETED"
    payload["disruption"]["effective_time"] = first["end_time"]
    response = client.post("/api/reoptimize", json=payload)
    assert response.status_code == 422, response.text
    assert "INVALID_EXECUTION_SNAPSHOT" in response.json()["detail"]["message"]
