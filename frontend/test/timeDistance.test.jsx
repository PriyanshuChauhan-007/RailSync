import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TimeDistanceDiagram from "../src/components/planning/TimeDistanceDiagram.jsx";
import { buildTimeDistanceModel, boundView, fitActivityView } from "../src/utils/timeDistanceModel.js";

afterEach(cleanup);
const horizon = { start_time: "2026-01-01T04:00:00", end_time: "2026-01-01T06:00:00" };
const territory = { territory_id: "demo", stations: [
  { station_id: "A", station_name: "Alpha", order: 1 }, { station_id: "B", station_name: "Beta", order: 2 },
], sections: [{ section_id: "AB", from_station: "A", to_station: "B" }], train_services: [
  { train_id: "T1", service_number: "123", service_name: "Demo express", station_sequence: ["A", "B"] },
] };
const occupancy = [{ train_id: "T1", section_id: "AB", entry_time: "2026-01-01T04:10:00", exit_time: "2026-01-01T04:20:00" }];
const blocks = [{ block_id: "BLK004", section_id: "AB", start_time: "2026-01-01T04:30:00", end_time: "2026-01-01T05:30:00", tasks: ["E1", "P1"], integrated: true, status: "DRAFT", capacity_resource_ids: ["M1"] }];
const tasks = [{ task_id: "E1", department: "ENG", task_type: "Inspection" }, { task_id: "P1", department: "TRD", task_type: "Power work" }];
const props = { territory, occupancy, blocks, tasks, horizon };

describe("time-distance presentation", () => {
  it("renders recorded trains and one shared possession, supports focus and persistent selection", () => {
    const onSelectBlock = vi.fn();
    const { rerender } = render(<TimeDistanceDiagram {...props} onSelectBlock={onSelectBlock} />);
    const train = screen.getByRole("button", { name: "Select train 123 · Demo express" });
    fireEvent.focus(train);
    expect(screen.getByRole("region", { name: "Train details" }).textContent).toContain("Alpha → Beta");
    expect(screen.getByRole("region", { name: "Train details" }).textContent).toContain("04:10–04:20");
    fireEvent.click(train); fireEvent.blur(train);
    expect(train.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(screen.getByRole("button", { name: "Select possession BLK004" }), { key: "Enter" });
    expect(onSelectBlock).toHaveBeenLastCalledWith("BLK004");
    rerender(<TimeDistanceDiagram {...props} onSelectBlock={onSelectBlock} selectedBlockId="BLK004" />);
    expect(screen.getByRole("region", { name: "Possession details" }).textContent).toContain("TRD · Power work");
    expect(screen.getAllByRole("button", { name: "Select possession BLK004" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onSelectBlock).toHaveBeenLastCalledWith("");
  });

  it("toggles real layers and zooms, pans, resets without altering plan data", () => {
    const original = JSON.stringify(props);
    render(<TimeDistanceDiagram {...props} />);
    expect(screen.queryByRole("button", { name: "Buffers", exact: true })).toBeNull();
    expect(screen.queryByRole("button", { name: "Conflicts", exact: true })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Trains", exact: true }));
    expect(screen.queryByRole("button", { name: /Select train/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Possessions", exact: true }));
    expect(screen.queryByRole("button", { name: /Select possession/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in time" }));
    expect(Number(screen.getByLabelText("Time zoom").textContent.replace("×", ""))).toBeGreaterThan(2);
    fireEvent.click(screen.getByRole("button", { name: "Pan later" }));
    expect(Number(screen.getByLabelText("Time position").value)).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Reset View" }));
    expect(Number(screen.getByLabelText("Time zoom").textContent.replace("×", ""))).toBeGreaterThan(1);
    expect(screen.getByLabelText("Time position").value).toBe("0");
    fireEvent.click(screen.getByRole("button", { name: "Full horizon" }));
    expect(screen.getByLabelText("Time zoom").textContent).toBe("1×");
    expect(JSON.stringify(props)).toBe(original);
  });

  it("shows optional layers only for explicit data and ghosts only from real prior positions", () => {
    const { container } = render(<TimeDistanceDiagram {...props}
      blocks={[{ ...blocks[0], setup_minutes: 10 }]}
      previousBlocks={[{ ...blocks[0], start_time: "2026-01-01T04:20:00" }]}
      conflicts={[{ section_id: "AB", start_time: blocks[0].start_time, end_time: blocks[0].end_time, reason: "Fixture conflict" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Buffers", exact: true }));
    expect(container.querySelectorAll(".td-buffer")).toHaveLength(1);
    expect(container.querySelectorAll(".td-ghost")).toHaveLength(1);
    expect(container.querySelectorAll(".td-conflict")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Conflicts", exact: true }));
    expect(container.querySelector(".td-conflict")).toBeNull();
  });

  it("does not invent direction or merge distinct overlapping blocks", () => {
    const missing = { ...territory, train_services: [] };
    const model = buildTimeDistanceModel(missing, occupancy, [...blocks, { ...blocks[0], block_id: "OTHER", integrated: false }], horizon);
    expect(model.trains[0].segments[0].knownDirection).toBe(false);
    expect(model.trains[0].segments[0].from).toBeNull();
    expect(model.possessions).toHaveLength(2);
    expect(model.possessions[0].bands[0].lane).not.toBe(model.possessions[1].bands[0].lane);
    expect(boundView(999, 20, 120)).toEqual({ zoom: 20, start: 114 });
    expect(boundView(999, 100, 120)).toEqual({ zoom: 32, start: 116.25 });
    render(<TimeDistanceDiagram {...props} territory={missing} tasks={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Select train T1" }));
    expect(screen.getByRole("region", { name: "Train details" }).textContent).toContain("traversal direction unavailable");
  });

  it("presents a compact real train baseline without invented possessions", () => {
    const { container } = render(<TimeDistanceDiagram {...props} blocks={[]} />);
    expect(screen.getByRole("heading", { name: "Train occupancy baseline" })).toBeTruthy();
    expect(screen.getByText(/1 timetable services across Alpha → Beta/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select train 123 · Demo express" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Select possession/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Possessions" })).toBeNull();
    expect(screen.queryByText("Solver possession")).toBeNull();
    expect(container.querySelectorAll(".td-possession")).toHaveLength(0);
    expect(Number(screen.getByLabelText("Time zoom").textContent.replace("×", ""))).toBeGreaterThan(1);
    expect(Number(container.querySelector("svg").getAttribute("viewBox").split(" ").at(-1))).toBeLessThan(168);
  });

  it("fits a selected possession, restores full horizon, and names the focused section", () => {
    const model = buildTimeDistanceModel(territory, occupancy, blocks, horizon, tasks);
    const fit = fitActivityView(model, "BLK004");
    render(<TimeDistanceDiagram {...props} selectedBlockId="BLK004" selectedSection="AB" />);
    expect(screen.getByRole("button", { name: "Select possession BLK004" })).toBeTruthy();
    expect(Number(screen.getByLabelText("Time position").value)).toBeCloseTo(fit.start);
    expect(screen.getByText("Focused section: Alpha → Beta")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Possession details" }).textContent).toContain("Alpha → Beta (AB)");
    expect(screen.getByRole("region", { name: "Possession details" }).textContent).toContain("04:30–05:30");
    expect(screen.getByRole("region", { name: "Possession details" }).textContent).toContain("DRAFT");
    expect(screen.getByRole("region", { name: "Possession details" }).textContent).toContain("Resources: M1");
    fireEvent.click(screen.getByRole("button", { name: "Full horizon" }));
    expect(screen.getByLabelText("Time zoom").textContent).toBe("1×");
    fireEvent.click(screen.getByRole("button", { name: "Focus selected" }));
    expect(Number(screen.getByLabelText("Time position").value)).toBeCloseTo(fit.start);
  });

  it("finds a possession from the selected task when no block is selected", () => {
    const model = buildTimeDistanceModel(territory, occupancy, blocks, horizon, tasks);
    render(<TimeDistanceDiagram {...props} selectedTaskId="E1" />);
    expect(Number(screen.getByLabelText("Time position").value)).toBeCloseTo(fitActivityView(model, null, "E1").start);
  });
});
