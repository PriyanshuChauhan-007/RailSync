import { useState } from "react";
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PlanningWorkspace from "../src/pages/PlanningWorkspace.jsx";
import RailSaathi from "../src/components/assistant/RailSaathi.jsx";
import ScenarioLab from "../src/pages/ScenarioLab.jsx";
import * as api from "../src/services/api.js";

vi.mock("../src/services/api.js", () => ({
  getTerritories: vi.fn().mockResolvedValue({ territories: [] }), getTasks: vi.fn(),
  getTerritory: vi.fn(), getTrains: vi.fn(), optimizePlan: vi.fn(),
  reoptimizePlan: vi.fn(), adoptRecoveredPlan: vi.fn(),
  askCopilot: vi.fn().mockResolvedValue({ answer: "Recorded block", engine: "FACTUAL_FALLBACK" }),
}));
vi.mock("../src/components/planning/RiskControls.jsx", () => ({ default: () => null, RiskResult: () => null }));
vi.mock("../src/components/planning/PlannerCorridor.jsx", () => ({ default: () => null }));
vi.mock("../src/components/planning/MaintenanceTimeline.jsx", () => ({ default: () => null }));
vi.mock("../src/components/planning/RecoveryTimeline.jsx", () => ({ default: () => null }));
vi.mock("../src/components/planning/MaintenanceTaskList.jsx", () => ({ default: ({ selectedTaskId }) => <output data-testid="planning-task">{selectedTaskId}</output> }));
vi.mock("../src/components/planning/BlockDetails.jsx", () => ({ default: ({ block }) => <output data-testid="planning-block">{block?.block_id}</output> }));
vi.mock("../src/components/planning/OptimizerControls.jsx", () => ({ default: () => null }));
vi.mock("../src/components/planning/OperationalPanels.jsx", () => ({ default: () => null }));
afterEach(cleanup);

it("keeps judge-facing workspace copy singular and operationally scoped", () => {
  const operations = readFileSync("src/components/planning/OperationalPanels.jsx", "utf8");
  const comparison = readFileSync("src/components/analysis/ComparisonSummary.jsx", "utf8");
  expect(operations).toContain("Advanced · Data inputs");
  expect(operations).toContain("Review &amp; alternatives");
  expect(operations.indexOf("Plan lifecycle")).toBeLessThan(operations.indexOf("Rolling planning"));
  expect(operations).toContain('timetable source{operational.sources.service_source_urls.length === 1 ? "" : "s"}');
  expect(comparison).not.toContain("DID RAILSYNC IMPROVE THE PLAN?");
});

it("starts the public demo with a recovery event that visibly changes its plan", () => {
  const session = {
    territoryId: "saktigarh_memari_public_demo",
    territory: {
      territory_id: "saktigarh_memari_public_demo",
      display_name: "Eastern demo",
      stations: [], sections: [], resources: { crew: [], machines: [] },
    },
    trains: [
      { train_id: "37786", section_id: "SKM_SEC01" },
      { train_id: "37814", section_id: "SKM_SEC01" },
    ],
    tasks: [], recovery: null, riskConfig: { mode: "STATIC" },
    plan: {
      blocks: [], unscheduled_tasks: [], proof_state: "FULLY_OPTIMAL",
      planning_context: {
        territory_id: "saktigarh_memari_public_demo",
        horizon_start: "2017-11-01T03:30:00",
        horizon_end: "2017-11-01T08:00:00",
      },
    },
  };

  render(<ScenarioLab session={session} setSession={vi.fn()} onNavigate={vi.fn()} />);

  expect(screen.getByRole("combobox", { name: "Scenario train" }).value).toBe("37814");
  expect(screen.getByRole("spinbutton", { name: "Delay minutes" }).value).toBe("25");
});

it("adopts the complete recovered plan and updates the shared operating context", async () => {
  const basePlan = {
    blocks: [{ block_id: "OLD", tasks: ["T1"] }], unscheduled_tasks: [],
    proof_state: "FULLY_OPTIMAL", analysis: { marker: "old" },
    plan_identity: { plan_id: "demo-v1" },
    planning_context: { territory_id: "demo", horizon_start: "2026-01-01T04:00:00", horizon_end: "2026-01-01T06:00:00" },
  };
  const recoveredPlan = {
    ...basePlan,
    blocks: [{ block_id: "NEW", tasks: ["T1"] }],
    analysis: { railsync: { blocks: [{ block_id: "NEW", tasks: ["T1"] }] } },
    plan_identity: { plan_id: "demo-v2", parent_plan_id: "demo-v1" },
  };
  const recovery = {
    recovery_id: "recovery-1", disruption: { type: "TRAIN_DELAY", effective_time: "2026-01-01T04:00:00" },
    recovered_plan: { blocks: recoveredPlan.blocks, unscheduled_tasks: [], proof_state: "FULLY_OPTIMAL", unscheduled_diagnostics: [] },
    recovery_metrics: { retained_blocks: 0, shifted_blocks: 1, cancelled_blocks: 0, new_blocks: 0, retained_tasks: 0, shifted_tasks: 1, unscheduled_tasks_after_disruption: 0, total_shift_minutes: 10 },
    immutable_task_ids: [], affected_sections: [], invalidated_blocks: [], newly_unscheduled_task_ids: [],
    train_occupancy: [{ train_id: "TR1", section_id: "AB" }], risk: {}, escalation_required: false,
  };
  api.adoptRecoveredPlan.mockResolvedValueOnce(recoveredPlan);
  function Harness() {
    const [session, setSession] = useState({
      territoryId: "demo", territory: { territory_id: "demo", display_name: "Demo", sections: [], resources: { crew: [], machines: [] } },
      trains: [], tasks: [{ task_id: "T1", task_type: "Track inspection" }], plan: basePlan, recovery,
      riskConfig: { mode: "STATIC" }, assistantPreview: { answer: "stale" },
    });
    return <><ScenarioLab session={session} setSession={setSession} onNavigate={vi.fn()} />
      <span hidden data-testid="scenario-session">{JSON.stringify(session)}</span></>;
  }
  render(<Harness />);

  fireEvent.click(screen.getByRole("button", { name: "Adopt Recovered Plan" }));

  await waitFor(() => expect(api.adoptRecoveredPlan).toHaveBeenCalledWith(
    "recovery-1", "demo-v1", expect.any(Object),
  ));
  await waitFor(() => expect(JSON.parse(screen.getByTestId("scenario-session").textContent).plan).toEqual(recoveredPlan));
  const latestSession = JSON.parse(screen.getByTestId("scenario-session").textContent);
  expect(latestSession.previousPlan).toEqual(basePlan);
  expect(latestSession.trains).toEqual(recovery.train_occupancy);
  expect(latestSession.recovery).toBeNull();
  expect(latestSession.assistantPreview).toBeNull();
  expect(screen.getByRole("status").textContent).toMatch(/1 possession retimed/i);
});

it("diagram selection updates real Planning selection and the RailSaathi request", async () => {
  const territory = { territory_id: "demo", display_name: "Demo", stations: [
    { station_id: "A", order: 1 }, { station_id: "B", order: 2 },
  ], sections: [{ section_id: "AB", from_station: "A", to_station: "B" }],
  planning_horizon: { start_time: "2026-01-01T04:00:00", end_time: "2026-01-01T06:00:00" } };
  const tasks = [{ task_id: "T1", section_id: "AB" }, { task_id: "T4", section_id: "AB" }];
  const blocks = tasks.map((task, index) => ({ block_id: index ? "BLK004" : "BLK001",
    tasks: [task.task_id], section_id: "AB", start_time: "2026-01-01T04:30:00", end_time: "2026-01-01T05:00:00" }));
  const plan = { blocks, unscheduled_tasks: [], plan_identity: { plan_id: "P1" } };
  function Harness() {
    const [session, setSession] = useState({ territory, territoryId: "demo", tasks, trains: [], plan, selectedBlockId: "BLK001", selectedTaskId: "T1" });
    return <><PlanningWorkspace session={session} setSession={setSession} />
      <RailSaathi territory={territory} territoryId="demo" plan={session.plan}
        selectedBlock={blocks.find(block => block.block_id === session.selectedBlockId)}
        selectedTask={tasks.find(task => task.task_id === session.selectedTaskId)} /></>;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Time–distance", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Select possession BLK004" }));
  expect(screen.getByTestId("planning-block").textContent).toBe("BLK004");
  expect(screen.getByTestId("planning-task").textContent).toBe("T4");
  fireEvent.click(screen.getByRole("button", { name: "Open RailSaathi" }));
  fireEvent.click(screen.getByRole("button", { name: "Why this window?" }));
  await waitFor(() => expect(api.askCopilot).toHaveBeenCalled());
  expect(api.askCopilot.mock.calls[0][0]).toMatchObject({ selected_block_id: "BLK004", selected_task_id: "T4" });
});
