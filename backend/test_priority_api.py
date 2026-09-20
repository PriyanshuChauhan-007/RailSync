from fastapi.testclient import TestClient

from backend.main import app


def test_planning_exposes_hand_checkable_priority_breakdown():
    response = TestClient(app).post(
        "/api/optimize", json={"territory_id": "saktigarh_memari_public_demo"}
    )
    assert response.status_code == 200
    priorities = response.json()["operational_diagnostics"]["task_priorities"]
    assert priorities
    for task in priorities:
        assert 0 <= task["priority_score"] <= 100
        assert sum(task["factor_breakdown"].values()) == task["priority_score"]
        assert task["priority_band"] in {"CRITICAL", "HIGH", "MEDIUM", "ROUTINE"}
        assert task["human_readable_explanation"]
