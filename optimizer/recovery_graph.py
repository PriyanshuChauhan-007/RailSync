"""Resource dependency scope selection for recovery.

Only modeled shared capacity and explicit dependencies create edges. The
solver and independent validator, rather than this graph, decide feasibility.
"""

from dataclasses import dataclass
from datetime import timedelta

try:
    from .candidate_windows import OperationalAllowances, generate_footprint_windows
    from .capacity import normalize_tasks
    from .feasibility import evaluate_task_in_window, task_requirements
    from .time_utils import parse_datetime
except ImportError:  # Legacy direct-module imports.
    from candidate_windows import OperationalAllowances, generate_footprint_windows
    from capacity import normalize_tasks
    from feasibility import evaluate_task_in_window, task_requirements
    from time_utils import parse_datetime


@dataclass(frozen=True)
class RecoveryGraph:
    adjacency: dict[str, frozenset[str]]
    reasons: dict[tuple[str, str], tuple[str, ...]]

    def expand(self, seed: set[str], hops: int) -> set[str]:
        scope = set(seed)
        for _ in range(hops):
            scope.update(neighbor for block_id in tuple(scope)
                         for neighbor in self.adjacency.get(block_id, ()))
        return scope


def _overlaps(first, second):
    return any(a < d and c < b for a, b in first for c, d in second)


def build_recovery_graph(data, blocks, start, end, *, resources=None,
                         allowances=OperationalAllowances(), snapshot_as_of=None):
    """Connect whole future possessions with overlapping reachable resource use."""
    tasks = normalize_tasks(data["maintenance_tasks"], data.get("sections", []))
    by_id = {task["task_id"]: task for task in tasks}
    eligible = [block for block in blocks
                if block.get("status") not in {"IN_PROGRESS", "COMPLETED", "CANCELLED"}]
    cutoff = parse_datetime(snapshot_as_of or start)
    footprints = [dict(section_id=task["section_id"], section_ids=task["_section_ids"],
                       capacity_resource_ids=task["_capacity_resource_ids"]) for task in tasks]
    windows = generate_footprint_windows(data["train_occupancy"], footprints,
                                          data.get("sections", []), start, end, allowances)
    envelopes = {}
    consumed = {}
    task_to_block = {}
    for block in eligible:
        block_id = block["block_id"]
        intervals = []
        keys = set()
        for task_id in block["tasks"]:
            task_to_block[task_id] = block_id
            task = by_id[task_id]
            duration = task_requirements(task, allowances).required_minutes
            for window in windows:
                if window.footprint_id != task["_footprint_id"]:
                    continue
                feasibility = evaluate_task_in_window(
                    task, window, allowances=allowances, resource_context=resources)
                for left, right in feasibility.start_ranges:
                    left = max(parse_datetime(left), cutoff)
                    right = parse_datetime(right)
                    if left <= right:
                        intervals.append((left, right + timedelta(minutes=duration)))
            for resource_id in task["_capacity_resource_ids"]:
                keys.add(f"track:{resource_id}")
            for field, prefix, capacities in (
                ("crew_type", "crew", resources.crew_capacities if resources else {}),
                ("machine_type", "machine", resources.machine_capacities if resources else {}),
            ):
                pool = task.get(field)
                if pool and pool in capacities:
                    keys.add(f"{prefix}:{pool}")
        envelopes[block_id] = intervals
        consumed[block_id] = keys
    adjacency = {block["block_id"]: set() for block in eligible}
    reasons = {}
    for index, first in enumerate(eligible):
        a = first["block_id"]
        for second in eligible[index + 1:]:
            b = second["block_id"]
            shared = consumed[a] & consumed[b]
            dependency = any(task_id in task_to_block and task_to_block[task_id] == b
                             for member in first["tasks"]
                             for task_id in by_id[member].get("depends_on_task_ids", ())) or any(
                                 task_id in task_to_block and task_to_block[task_id] == a
                                 for member in second["tasks"]
                                 for task_id in by_id[member].get("depends_on_task_ids", ()))
            causes = sorted(shared) if shared and _overlaps(envelopes[a], envelopes[b]) else []
            if dependency:
                causes.append("explicit-task-dependency")
            if causes:
                adjacency[a].add(b)
                adjacency[b].add(a)
                reasons[(a, b)] = tuple(causes)
    return RecoveryGraph({key: frozenset(value) for key, value in adjacency.items()}, reasons)
