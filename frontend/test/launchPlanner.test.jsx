import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../src/App.jsx";

vi.mock(import("../src/services/api.js"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getTerritories: vi.fn().mockResolvedValue({
      territories: [
        { territory_id: "delhi_agra", display_name: "Northern HDN", planning_ready: true },
      ],
    }),
    getTerritory: vi.fn().mockResolvedValue({
      territory_id: "delhi_agra",
      display_name: "Northern HDN",
      sections: [{ section_id: "SEC1" }],
      stations: [],
      resources: { crew: [], machines: [] },
    }),
    getTasks: vi.fn().mockResolvedValue({ territory_id: "delhi_agra", tasks: [] }),
    getTrains: vi.fn().mockResolvedValue({ territory_id: "delhi_agra", trains: [] }),
    getMlStatus: vi.fn().mockResolvedValue({ status: "ok" }),
    getRollingPlan: vi.fn().mockResolvedValue({ windows: [] }),
    getResources: vi.fn().mockResolvedValue({ crew: [], machines: [] }),
    getAlerts: vi.fn().mockResolvedValue([]),
    optimizePlan: vi.fn(),
    askCopilot: vi.fn(),
  };
});

afterEach(cleanup);

beforeEach(() => {
  window.scrollTo = vi.fn();
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

it("renders landing and clicks Launch Planner from hero", async () => {
  render(<App />);
  const launchButtons = screen.getAllByRole("button", { name: /Launch Planner/i });
  expect(launchButtons.length).toBeGreaterThan(0);

  // Click the hero button
  fireEvent.click(launchButtons[launchButtons.length - 1]);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Planning Workspace" })).toBeTruthy();
  });
});

it("launches planner from navbar cleanly", async () => {
  render(<App />);
  const navLaunchBtn = screen.getAllByRole("button", { name: /Launch Planner/i })[0];
  fireEvent.click(navLaunchBtn);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Planning Workspace" })).toBeTruthy();
  });
});

