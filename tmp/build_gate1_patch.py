"""Build a patch containing only this task's Gate 1 changes."""
from difflib import unified_diff
from pathlib import Path

root = Path(__file__).resolve().parents[1]
chunks = []
for name in ("optimizer/recovery_validation.py", "optimizer/test_recovery_validation.py"):
    after = (root / name).read_text(encoding="utf-8").splitlines(keepends=True)
    chunks.extend(unified_diff([], after, fromfile=f"a/{name}", tofile=f"b/{name}"))

name = "optimizer/optimizer.py"
after_text = (root / name).read_text(encoding="utf-8")
before_text = after_text.replace("    from .recovery_validation import validate_complete_plan\n", "")
before_text = before_text.replace("    from recovery_validation import validate_complete_plan\n", "")
before_text = before_text.replace(
    "    complete_validation = validate_complete_plan(\n"
    "        data, blocks, horizon_start_dt.isoformat(), horizon_end_dt.isoformat(),\n"
    "        resources=resource_context, allowances=allowances,\n"
    "        unscheduled_task_ids=unscheduled_tasks,\n"
    "    )\n"
    "    facts[\"complete_validation\"] = complete_validation.as_dict()\n"
    "    if not complete_validation.valid:\n"
    "        raise ValueError(f\"Independent complete-plan validation failed: {facts['complete_validation']}\")\n",
    "",
)
assert before_text != after_text
chunks.extend(unified_diff(
    before_text.splitlines(keepends=True), after_text.splitlines(keepends=True),
    fromfile=f"a/{name}", tofile=f"b/{name}",
))
out = root / "artifacts" / "implementation-checkpoints" / "gate-1.patch"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("".join(chunks), encoding="utf-8")
print(out, out.stat().st_size)
