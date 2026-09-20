import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import PriorityFeasibility from "../src/components/planning/PriorityFeasibility.jsx";
import MaintenanceTimeline from "../src/components/planning/MaintenanceTimeline.jsx";

afterEach(cleanup);

const horizon = { start_time: "2026-01-01T04:00:00", end_time: "2026-01-01T06:00:00" };
const task = {
  task_id: "T1", task_type: "Rail weld inspection", department: "ENG",
  section_id: "AB", duration_minutes: 20,
};
const diagnostics = {
  task_priorities: [{
    task_id: "T1", task_type: task.task_type, department: "ENG", section_id: "AB",
    criticality: 9, urgency: 8, overdue_days: 12, deadline: "2026-01-02T00:00:00",
    category: "CRITICAL", solver_outcome: "SELECTED",
  }],
  candidate_windows: [{
    task_id: "T1", window_id: "W1", section_id: "AB", section_ids: ["AB"],
    usable_start: "2026-01-01T04:30:00", usable_end: "2026-01-01T05:15:00",
    nominal_start: "2026-01-01T04:15:00", nominal_end: "2026-01-01T05:30:00",
    usable_minutes: 45, nominal_minutes: 75, margin_before_minutes: 15, margin_after_minutes: 15,
    feasible: true, reasons: [], resource_checks: { crew: "PASSED" }, solver_selected: true,
    outcome: "SELECTED", capacity_resource_ids: ["AB"],
  }],
  conflicts: [{
    conflict_id: "CF1", task_id: "T1", train_id: "TR1", section_id: "AB",
    train_entry_time: "2026-01-01T04:10:00", train_exit_time: "2026-01-01T04:15:00",
    protected_start: "2026-01-01T04:00:00", protected_end: "2026-01-01T04:30:00",
    train_occupancy_minutes: 5, protected_interval_minutes: 30, minimum_clearance_minutes: 30,
    reason_code: "TRAIN_OCCUPANCY_SAFETY_EXCLUSION", severity: "CRITICAL",
  }],
  coordination_opportunities: [{
    opportunity_id: "CO1", task_ids: ["T1", "T2"], section_id: "AB",
    departments: ["ENG", "SNT"], compatibility_status: "COMPATIBLE",
    reason_codes: [], solver_selected_together: true,
  }],
};
const territory = {
  territory_id: "demo",
  stations: [{ station_id: "A", station_name: "Alpha" }, { station_id: "B", station_name: "Beta" }],
  sections: [{ section_id: "AB", from_station: "A", to_station: "B" }],
  train_services: [{ train_id: "TR1", service_number: "123", service_name: "Demo local" }],
};

it("explains selected-task priority and feasibility from deterministic diagnostics", () => {
  render(<PriorityFeasibility task={task} diagnostics={diagnostics} territory={territory} />);

  expect(screen.getByRole("heading", { name: "Priority & Feasibility" })).toBeTruthy();
  expect(screen.getAllByText("Critical", { exact: true })).toHaveLength(2);
  expect(screen.getByText(/Criticality 9\/10/)).toBeTruthy();
  expect(screen.getByText(/1 feasible window/)).toBeTruthy();
  expect(screen.getByText(/1 recorded train safety exclusion/)).toBeTruthy();
  expect(screen.getByText(/04:30–05:15/)).toBeTruthy();
  expect(screen.getByText(/Selected by CP-SAT/)).toBeTruthy();
  expect(screen.getByText(/No ML score/)).toBeTruthy();
});

it("draws selected-task candidate windows and safety exclusions on the section timeline", () => {
  render(<MaintenanceTimeline
    sectionId="AB" occupancy={[]} blocks={[]} horizon={horizon} hasPlan
    selectedBlockId="" onSelectBlock={() => {}} territory={territory} tasks={[task]}
    selectedTaskId="T1" diagnostics={diagnostics}
  />);

  expect(screen.getByLabelText("Candidate window W1: 04:30 to 05:15; selected by CP-SAT")).toBeTruthy();
  expect(screen.getByLabelText("Train 123 · Demo local protected interval: 04:00 to 04:30")).toBeTruthy();
});
