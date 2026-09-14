import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TimeDistanceDiagram from "../src/components/planning/TimeDistanceDiagram.jsx";
import { buildTimeDistanceModel, boundView } from "../src/utils/timeDistanceModel.js";

afterEach(cleanup);
const horizon = { start_time: "2026-01-01T04:00:00", end_time: "2026-01-01T06:00:00" };
const territory = { territory_id: "demo", stations: [
  { station_id: "A", station_name: "Alpha", order: 1 }, { station_id: "B", station_name: "Beta", order: 2 },
], sections: [{ section_id: "AB", from_station: "A", to_station: "B" }], train_services: [
  { train_id: "T1", service_number: "123", service_name: "Demo express", station_sequence: ["A", "B"] },
] };
const occupancy = [{ train_id: "T1", section_id: "AB", entry_time: "2026-01-01T04:10:00", exit_time: "2026-01-01T04:20:00" }];
const blocks = [{ block_id: "BLK004", section_id: "AB", start_time: "2026-01-01T04:30:00", end_time: "2026-01-01T05:30:00", tasks: ["E1", "P1"], integrated: true }];
const tasks = [{ task_id: "E1", department: "ENG", task_type: "Inspection" }, { task_id: "P1", department: "TRD", task_type: "Power work" }];
const props = { territory, occupancy, blocks, tasks, horizon };

describe("time-distance presentation", () => {
  it("renders recorded trains and one shared possession, supports focus and persistent selection", () => {
    const onSelectBlock = vi.fn();
    const { rerender } = render(<TimeDistanceDiagram {...props} onSelectBlock={onSelectBlock} />);
    const train = screen.getByRole("button", { name: "Select train 123 · Demo express" });
    fireEvent.focus(train);
    expect(screen.getByRole("region", { name: "Train details" }).textContent).toContain("Alpha → Beta");
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
    expect(screen.getByLabelText("Time zoom").textContent).toBe("2×");
    fireEvent.click(screen.getByRole("button", { name: "Pan later" }));
    expect(Number(screen.getByLabelText("Time position").value)).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Reset View" }));
    expect(screen.getByLabelText("Time zoom").textContent).toBe("1×");
    expect(screen.getByLabelText("Time position").value).toBe("0");
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
    expect(boundView(999, 20, 120)).toEqual({ zoom: 8, start: 105 });
    render(<TimeDistanceDiagram {...props} territory={missing} tasks={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Select train T1" }));
    expect(screen.getByRole("region", { name: "Train details" }).textContent).toContain("traversal direction unavailable");
  });
});
