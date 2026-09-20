"""Build a task-only diff for Gate 2 over the dirty starting checkout."""
from difflib import unified_diff
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
new_files = (
    "optimizer/priority.py", "optimizer/test_priority.py",
    "backend/test_priority_api.py", "docs/PRIORITY_ENGINE.md",
    "artifacts/priority/example.json",
)
clean_tracked = (
    "optimizer/possessions.py", "optimizer/comparison.py",
    "optimizer/test_integration.py", "optimizer/test_comparison.py",
)
dirty_tracked = (
    "optimizer/optimizer.py", "backend/planning_service.py", "backend/schemas.py",
)
chunks = []


def add(name, before):
    after = (root / name).read_text(encoding="utf-8")
    assert before != after, name
    chunks.extend(unified_diff(
        before.splitlines(keepends=True), after.splitlines(keepends=True),
        fromfile=f"a/{name}", tofile=f"b/{name}",
    ))


for name in new_files:
    add(name, "")
for name in clean_tracked:
    baseline = subprocess.run(["git", "show", "HEAD:" + name], cwd=root,
                              capture_output=True, check=True).stdout.decode("utf-8")
    add(name, baseline)

name = "optimizer/optimizer.py"
after = (root / name).read_text(encoding="utf-8")
before = after
for addition in (
    "    from .priority import PriorityWeights, score_task\n",
    "    from priority import PriorityWeights, score_task\n",
    "    priority_weights: PriorityWeights = PriorityWeights(),\n",
    "    facts[\"priority_scores\"] = {\n"
    "        task[\"task_id\"]: score_task(\n"
    "            task,\n"
    "            len({fact[\"window_id\"] for fact in facts[\"task_windows\"]\n"
    "                 if fact[\"task_id\"] == task[\"task_id\"] and fact[\"feasible\"]}),\n"
    "            priority_weights,\n"
    "        ).as_dict()\n"
    "        for task in maintenance_tasks\n"
    "    }\n",
    "        priority_scores={task_id: result[\"priority_score\"]\n"
    "                         for task_id, result in facts[\"priority_scores\"].items()},\n",
):
    assert addition in before, addition
    before = before.replace(addition, "", 1)
add(name, before)

name = "backend/planning_service.py"
after = (root / name).read_text(encoding="utf-8")
before = after
for addition in (
    "from optimizer.priority import score_task\n",
    "    priority_scores = optimized.get(\"priority_scores\") or {\n"
    "        task[\"task_id\"]: score_task(\n"
    "            task,\n"
    "            len({fact[\"window_id\"] for fact in optimized.get(\"task_windows\", [])\n"
    "                 if fact[\"task_id\"] == task[\"task_id\"] and fact[\"feasible\"]}),\n"
    "        ).as_dict()\n"
    "        for task in tasks\n"
    "    }\n",
    "            **priority_scores[task[\"task_id\"]],\n",
):
    assert addition in before, addition
    before = before.replace(addition, "", 1)
add(name, before)

name = "backend/schemas.py"
after = (root / name).read_text(encoding="utf-8")
addition = (
    "    priority_score: int\n"
    "    priority_band: Literal[\"CRITICAL\", \"HIGH\", \"MEDIUM\", \"ROUTINE\"]\n"
    "    factor_breakdown: Dict[str, int]\n"
    "    human_readable_explanation: str\n"
)
assert addition in after
add(name, after.replace(addition, "", 1))

out = root / "artifacts" / "implementation-checkpoints" / "gate-2.patch"
out.write_text("".join(chunks), encoding="utf-8")
print(out, out.stat().st_size)
