"""A recovery preview may be adopted only against its original plan/world."""

from fastapi.testclient import TestClient

from backend.main import app
from backend import operations_service, recovery_service


client = TestClient(app)
TERRITORY = "eastern_hdn_test_fixture"


def preview():
    base_response = client.post("/api/optimize", json={"territory_id": TERRITORY})
    assert base_response.status_code == 200
    base = base_response.json()
    response = client.post("/api/reoptimize", json={
        "territory_id": TERRITORY,
        "horizon_start": base["planning_context"]["horizon_start"],
        "horizon_end": base["planning_context"]["horizon_end"],
        "current_plan": {"blocks": base["blocks"],
                         "unscheduled_tasks": base["unscheduled_tasks"]},
        "parent_plan_id": base["plan_identity"]["plan_id"],
        "disruption": {"type": "TRAIN_DELAY", "train_id": "EHDN_TR103",
                       "delay_minutes": 10},
    })
    assert response.status_code == 200, response.text
    return base, response.json()["recovery_id"]


def test_newer_plan_makes_older_recovery_proposal_stale():
    base, recovery_id = preview()
    newer = client.post("/api/optimize", json={"territory_id": TERRITORY})
    assert newer.status_code == 200
    response = client.post("/api/recovery/adopt", json={
        "recovery_id": recovery_id, "parent_plan_id": base["plan_identity"]["plan_id"],
    })
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "STALE_PLAN"


def test_execution_update_makes_recovery_proposal_stale():
    base, recovery_id = preview()
    operations_service.transition_block(
        base["plan_identity"]["plan_id"], base["blocks"][0]["block_id"], "FROZEN"
    )
    response = client.post("/api/recovery/adopt", json={
        "recovery_id": recovery_id, "parent_plan_id": base["plan_identity"]["plan_id"],
    })
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "STALE_PLAN"


def test_preview_rejects_forged_client_plan_against_registered_parent():
    base_response = client.post("/api/optimize", json={"territory_id": TERRITORY})
    assert base_response.status_code == 200
    base = base_response.json()
    blocks = [dict(block) for block in base["blocks"]]
    blocks[0]["block_id"] = "FORGED_P"
    response = client.post("/api/reoptimize", json={
        "territory_id": TERRITORY,
        "horizon_start": base["planning_context"]["horizon_start"],
        "horizon_end": base["planning_context"]["horizon_end"],
        "current_plan": {"blocks": blocks, "unscheduled_tasks": base["unscheduled_tasks"]},
        "parent_plan_id": base["plan_identity"]["plan_id"],
        "disruption": {"type": "TRAIN_DELAY", "train_id": "EHDN_TR103",
                       "delay_minutes": 10},
    })
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "STALE_PLAN"


def test_adoption_rechecks_proposal_input_binding():
    base, recovery_id = preview()
    recovery_service._pending_recoveries[recovery_id]["input_binding"]["disruption"]["delay_minutes"] = 99
    response = client.post("/api/recovery/adopt", json={
        "recovery_id": recovery_id, "parent_plan_id": base["plan_identity"]["plan_id"],
    })
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "STALE_PLAN"


def test_execution_transition_requires_actual_facts():
    base_response = client.post("/api/optimize", json={"territory_id": TERRITORY})
    assert base_response.status_code == 200
    base = base_response.json()
    plan_id = base["plan_identity"]["plan_id"]
    block = base["blocks"][0]
    frozen = client.post(f"/api/plans/{plan_id}/blocks/{block['block_id']}/status",
                         json={"target_status": "FROZEN"})
    assert frozen.status_code == 200
    missing = client.post(f"/api/plans/{plan_id}/blocks/{block['block_id']}/status",
                          json={"target_status": "IN_PROGRESS"})
    assert missing.status_code == 422
    assert "INVALID_EXECUTION_SNAPSHOT" in missing.json()["detail"]["message"]
    started = client.post(f"/api/plans/{plan_id}/blocks/{block['block_id']}/status", json={
        "target_status": "IN_PROGRESS", "execution": {
            "actual_start_time": block["start_time"],
            "remaining_minutes_by_task": {task_id: 10 for task_id in block["tasks"]},
            "remaining_handback_minutes": 10,
        },
    })
    assert started.status_code == 200
    assert started.json()["actual_start_time"] == block["start_time"]
