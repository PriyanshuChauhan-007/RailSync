"""Explicit synthetic resource pools and section power windows; no default roster."""

from dataclasses import dataclass, field
from typing import Mapping

try:
    from .time_utils import datetime_to_minutes
except ImportError:
    from time_utils import datetime_to_minutes


@dataclass(frozen=True)
class PowerWindow:
    start_time: str
    end_time: str


@dataclass(frozen=True)
class ResourceContext:
    # Pools are shared globally across sections. Each task consumes one unit for
    # its entire setup/work/release reservation; no inferred travel or roster.
    crew_capacities: Mapping[str, int] = field(default_factory=dict)
    machine_capacities: Mapping[str, int] = field(default_factory=dict)
    # Absent section = unknown; present empty sequence = explicitly unavailable.
    power_windows: Mapping[str, tuple[PowerWindow, ...]] = field(default_factory=dict)
    # Optional roster/availability calendars. Missing pools remain unknown and
    # therefore capacity-only; explicitly empty calendars make the pool unavailable.
    crew_windows: Mapping[str, tuple[PowerWindow, ...]] = field(default_factory=dict)
    machine_windows: Mapping[str, tuple[PowerWindow, ...]] = field(default_factory=dict)
    crew_outages: Mapping[str, tuple[PowerWindow, ...]] = field(default_factory=dict)
    machine_outages: Mapping[str, tuple[PowerWindow, ...]] = field(default_factory=dict)

    def __post_init__(self):
        for pools in (self.crew_capacities, self.machine_capacities):
            for name, capacity in pools.items():
                if not isinstance(name, str) or not name:
                    raise ValueError("Resource pool names must be non-empty strings.")
                if isinstance(capacity, bool) or not isinstance(capacity, int) or capacity < 0:
                    raise ValueError("Resource capacities must be non-negative integers.")

    def validate_times(self, origin):
        for section in self.power_windows:
            power_intervals(self, section, origin)
        for calendars in (self.crew_windows, self.machine_windows,
                          self.crew_outages, self.machine_outages):
            for windows in calendars.values():
                _merge_windows(windows, origin)


def _merge_windows(windows, origin):
    merged = []
    intervals = []
    for window in windows:
        start = datetime_to_minutes(window.start_time, origin)
        end = datetime_to_minutes(window.end_time, origin)
        if start >= end:
            raise ValueError("Resource window must start before it ends.")
        intervals.append((start, end))
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
        else:
            merged.append((start, end))
    return merged


def power_intervals(context, section, origin):
    """Union touching/overlapping availability before testing full reservations."""
    return _merge_windows(context.power_windows.get(section, ()), origin)


def _intersect_start_ranges(ranges, windows, duration):
    return [
        (max(left, start), min(right, end - duration))
        for left, right in ranges
        for start, end in windows
        if max(left, start) <= min(right, end - duration)
    ]


def _subtract_outage_starts(ranges, outages, duration, origin):
    """Keep starts whose half-open reservation avoids unavailable bands."""
    remaining = list(ranges)
    for outage_start, outage_end in _merge_windows(outages, origin):
        next_ranges = []
        for left, right in remaining:
            if left <= min(right, outage_start - duration):
                next_ranges.append((left, min(right, outage_start - duration)))
            if max(left, outage_end) <= right:
                next_ranges.append((max(left, outage_end), right))
        remaining = next_ranges
    return remaining


def power_start_ranges(task, duration, earliest, latest, origin, context):
    """Inclusive legal reservation starts across power, roster, and machine calendars."""
    return reservation_start_ranges(
        task, duration, earliest, latest, origin, context
    )[0]


def reservation_start_ranges(task, duration, earliest, latest, origin, context):
    """Return legal starts plus resource-specific calendar availability facts."""
    if earliest > latest:
        if context is None:
            return [], {}
        checks = {}
        sections = task.get("_section_ids") or task.get("section_ids") or [task["section_id"]]
        required = task.get("requires_power_block", False) or task.get("requires_power_isolation", False)
        if required and any(section in context.power_windows for section in sections):
            checks["power"] = False
        if task.get("crew_type") in context.crew_windows:
            checks["crew"] = False
        if task.get("machine_type") in context.machine_windows:
            checks["machine"] = False
        return [], checks
    if context is None:
        return [(earliest, latest)], {}
    ranges = [(earliest, latest)]
    checks = {}
    required = task.get("requires_power_block", False) or task.get("requires_power_isolation", False)
    if required:
        power_configured = False
        for section in task.get("_section_ids") or task.get("section_ids") or [task["section_id"]]:
            if section in context.power_windows:
                power_configured = True
                ranges = _intersect_start_ranges(
                    ranges, power_intervals(context, section, origin), duration
                )
        if power_configured:
            checks["power"] = bool(ranges)
    for field_name, calendars in (
        ("crew_type", context.crew_windows),
        ("machine_type", context.machine_windows),
    ):
        pool = task.get(field_name)
        if pool and pool in calendars:
            ranges = _intersect_start_ranges(
                ranges, _merge_windows(calendars[pool], origin), duration
            )
            checks["crew" if field_name == "crew_type" else "machine"] = bool(ranges)
    for field_name, outages in (
        ("crew_type", context.crew_outages),
        ("machine_type", context.machine_outages),
    ):
        pool = task.get(field_name)
        if pool and pool in outages:
            ranges = _subtract_outage_starts(ranges, outages[pool], duration, origin)
            checks["crew" if field_name == "crew_type" else "machine"] = bool(ranges)
    return ranges, checks


def add_capacity_constraints(model, tasks, variables, context, *, origin=None,
                             fixed_reservations=None):
    if context is None:
        return
    for field_name, pools, outages in (
        ("crew_type", context.crew_capacities, context.crew_outages),
        ("machine_type", context.machine_capacities, context.machine_outages),
    ):
        for pool, capacity in pools.items():
            intervals = [variables[t["task_id"]]["interval"] for t in tasks if t.get(field_name) == pool]
            demands = [1] * len(intervals)
            for index, (left, right) in enumerate((fixed_reservations or {}).get(field_name, {}).get(pool, ())):
                intervals.append(model.NewIntervalVar(left, right - left, right,
                                                      f"{field_name}_{pool}_fixed_{index}"))
                demands.append(1)
            if pool in outages:
                if origin is None:
                    raise ValueError("Outage constraints require the planning origin")
                for index, (left, right) in enumerate(_merge_windows(outages[pool], origin)):
                    intervals.append(model.NewIntervalVar(left, right - left, right,
                                                          f"{field_name}_{pool}_outage_{index}"))
                    demands.append(capacity)
            if intervals:
                model.AddCumulative(intervals, demands, capacity)


def validate_capacities(reservations, context, *, origin=None):
    """Independent sweep: end events precede starts at equal timestamps."""
    if context is None:
        return
    for field_name, pools, outages in (
        ("crew_type", context.crew_capacities, context.crew_outages),
        ("machine_type", context.machine_capacities, context.machine_outages),
    ):
        for pool, capacity in pools.items():
            events = []
            for task, start, end in reservations:
                if task.get(field_name) == pool:
                    events.extend(((start, 1), (end, -1)))
            if pool in outages:
                if origin is None:
                    raise ValueError("Outage validation requires the planning origin")
                for left, right in _merge_windows(outages[pool], origin):
                    events.extend(((left, capacity), (right, -capacity)))
            used = 0
            for _, change in sorted(events):
                used += change
                if used > capacity:
                    raise ValueError(f"{field_name} capacity exceeded: {pool}")
