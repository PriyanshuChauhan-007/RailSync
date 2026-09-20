import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import HowItWorks from "../src/sections/HowItWorks.jsx";
import { demoCorridors } from "../src/components/schematic/demoCorridors.js";
import { trainModels, representativeTrains, sectionExtent } from "../src/components/schematic/railModel.js";

afterEach(() => { cleanup(); vi.useRealTimers(); });

it("keeps all three real corridors mounted when focusing another corridor and stage", () => {
  render(<HowItWorks />);
  expect(screen.getByRole("button", { name: "All corridors" }).getAttribute("aria-pressed")).toBe("true");
  const network = screen.getByTestId("rail-network");
  for (const corridor of demoCorridors) {
    expect(screen.getByRole("button", { name: corridor.name })).toBeTruthy();
    for (const station of corridor.stations) expect(network.textContent).toContain(station.station_name);
  }
  fireEvent.click(screen.getByRole("tab", { name: /Maintenance Demand/ }));
  fireEvent.click(screen.getByRole("button", { name: demoCorridors[1].name }));
  expect(screen.getByRole("tab", { name: /Maintenance Demand/ }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByTestId("rail-network")).toBe(network);
  expect(network.querySelectorAll(".rn-corridor")).toHaveLength(3);
  expect(network.querySelectorAll(".rn-moving-train").length).toBeGreaterThanOrEqual(6);
});

it("derives train directions from station order, including opposite Western and Northern services", () => {
  for (const corridor of demoCorridors.slice(1)) {
    const trains = representativeTrains(corridor, corridor.trains);
    expect(trains.some((train) => train.direction === -1)).toBe(true);
    expect(trains.some((train) => train.direction === 1)).toBe(true);
    expect(new Set(trains.map((train) => train.id)).size).toBe(trains.length);
  }
  expect(trainModels({ stations: [{ station_id: "A", order: 1 }], train_services: [] }, [{ train_id: "UNKNOWN", entry_time: "2026-01-01T01:00:00", exit_time: "2026-01-01T01:10:00" }])[0].direction).toBe(0);
  expect(sectionExtent(demoCorridors[0], ["SKM_SEC01"])).toEqual({ x: 80, width: 260 });
});

it("runs synchronized CP-SAT example states and permits inspection and replay", () => {
  vi.useFakeTimers();
  render(<HowItWorks />);
  fireEvent.click(screen.getByRole("tab", { name: /CP-SAT/ }));
  expect(screen.getByTestId("candidate-on-track").textContent).toContain("SCAN");
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByTestId("candidate-on-track").textContent).toContain("FEASIBLE");
  fireEvent.click(screen.getByRole("button", { name: /Candidate A/ }));
  expect(screen.getByTestId("candidate-on-track").textContent).toContain("REJECTED");
  expect(screen.getByRole("status").textContent).toContain("37814");
  fireEvent.click(screen.getByRole("button", { name: "Replay evaluation" }));
  expect(screen.getByTestId("candidate-on-track").textContent).toContain("SCAN");
});
