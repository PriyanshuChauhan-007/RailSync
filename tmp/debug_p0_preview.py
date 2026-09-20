from fastapi.testclient import TestClient
from backend.main import app
from backend import copilot_service as service, planning_service

client = TestClient(app)
territory_id = "saktigarh_memari_public_demo"
response = client.post("/api/optimize", json={"territory_id": territory_id})
print("optimize", response.status_code)
plan = response.json()
request = service.CopilotRequest(
    territory_id=territory_id, question="What if +15 min?", conversation_version=1,
    parent_plan_id=plan["plan_identity"]["plan_id"],
    selected_block_id=plan["blocks"][0]["block_id"],
    selected_task_id=plan["blocks"][0]["tasks"][0],
    current_plan={"blocks": plan["blocks"], "unscheduled_tasks": plan["unscheduled_tasks"]},
)
territory = planning_service.load_planning_territory(territory_id)
registered = service.resolve_plan(request)
context = service.build_context(territory, request, registered)
print(service._preview(request, territory, registered, context, 15)["diff"])
