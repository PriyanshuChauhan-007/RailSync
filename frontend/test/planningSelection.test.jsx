import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PlanningWorkspace from "../src/pages/PlanningWorkspace.jsx";
import RailSaathi from "../src/components/assistant/RailSaathi.jsx";
import * as api from "../src/services/api.js";

vi.mock("../src/services/api.js", () => ({
  getTerritories: vi.fn().mockResolvedValue({ territories: [] }), getTasks: vi.fn(),
  getTerritory: vi.fn(), getTrains: vi.fn(), optimizePlan: vi.fn(),
  askCopilot: vi.fn().mockResolvedValue({ answer: "Recorded block", engine: "FACTUAL_FALLBACK" }),
}));
vi.mock("../src/components/planning/RiskControls.jsx", () => ({ default: () => null, RiskResult: () => null }));
vi.mock("../src/components/planning/PlannerCorridor.jsx", () => ({ default: () => null }));
vi.mock("../src/components/planning/MaintenanceTimeline.jsx", () => ({ default: () => null }));
vi.mock("../src/components/planning/MaintenanceTaskList.jsx", () => ({ default: ({ selectedTaskId }) => <output data-testid="planning-task">{selectedTaskId}</output> }));
vi.mock("../src/components/planning/BlockDetails.jsx", () => ({ default: ({ block }) => <output data-testid="planning-block">{block?.block_id}</output> }));
vi.mock("../src/components/planning/OptimizerControls.jsx", () => ({ default: () => null }));
vi.mock("../src/components/planning/OperationalPanels.jsx", () => ({ default: () => null }));
afterEach(cleanup);

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
