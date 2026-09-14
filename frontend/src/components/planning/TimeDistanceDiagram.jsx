import { useId, useMemo, useRef, useState } from "react";
import { timeLabel } from "../../utils/timeline.js";
import { TD, MINUTE, buildTimeDistanceModel, boundView, fitActivityView, bufferSegments, sectionIds } from "../../utils/timeDistanceModel.js";
import "./timeDistance.css";

const EMPTY = [];
const activate = (event, action) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); action(); }
};

function BlockFacts({ block }) {
  return <>
    <div><strong>{block.block_id} · {block.integrated ? "Integrated / shared possession" : "Individual possession"}</strong>
      <p>{timeLabel(block.start_time)}–{timeLabel(block.end_time)} · {Math.round(block.end - block.start)} minutes</p>
      <p>Sections: {block.sectionNames.join(", ")}{block.status ? " · " + block.status : ""}</p></div>
    <div><strong>Included maintenance</strong><ul>{block.taskDetails.map(task => <li key={task.task_id}>
      {task.department ? task.department + " · " : ""}{task.task_type ?? task.task_id}
      {task.task_type ? " (" + task.task_id + ")" : ""}
    </li>)}</ul></div>
    <div><strong>Recorded operational context</strong>
      <p>Affected trains: {block.affected_trains?.join(", ") || "None listed in this block"}</p>
      {block.capacity_resource_ids?.length ? <p>Resources: {block.capacity_resource_ids.join(", ")}</p> : null}
      {block.power_isolation_zone_id ? <p>Power zone: {block.power_isolation_zone_id}</p> : null}
      {bufferSegments(block).map(buffer => <p key={buffer.kind}>{buffer.kind}: {buffer.end - buffer.start} minutes</p>)}
      {Number.isFinite(block.safety_buffer_minutes) ? <p>Safety buffer: {block.safety_buffer_minutes} minutes</p> : null}
    </div>
  </>;
}

function TrainFacts({ train, blocks }) {
  const related = blocks.filter(block => block.affected_trains?.includes(train.trainId));
  return <>
    <div><strong>{train.number}{train.name ? " · " + train.name : ""}</strong>
      <p>{train.direction ? "Direction: " + train.direction : "Direction not supplied"}</p>
      <p>Timetable-derived occupancy, not live tracking.</p>
      {related.length ? <p>Listed as affected by: {related.map(block => block.block_id).join(", ")}</p> : null}
    </div>
    <div className="td-train-times"><strong>Recorded section times</strong><ul>{train.segments.map((row, index) => <li key={index}>
      {row.knownDirection ? row.from.station_name + " → " + row.to.station_name : row.section_id + " (traversal direction unavailable)"}
      {" · " + timeLabel(row.entry_time) + "–" + timeLabel(row.exit_time)}
    </li>)}</ul></div>
  </>;
}

export default function TimeDistanceDiagram({
  territory, occupancy = EMPTY, blocks = EMPTY, tasks = EMPTY, horizon,
  selectedSection, selectedBlockId, selectedTaskId, onSelectBlock, previousBlocks = EMPTY, conflicts = EMPTY,
}) {
  const [selectedTrain, setSelectedTrain] = useState("");
  const [hovered, setHovered] = useState(null);
  const [layers, setLayers] = useState({ trains: true, possessions: true, buffers: false, conflicts: true });
  const drag = useRef(null);
  const clipId = useId().replaceAll(":", "");
  const rowSpacing = blocks.length ? TD.row : 56;
  const model = useMemo(() => buildTimeDistanceModel(territory, occupancy, blocks, horizon, tasks, rowSpacing), [territory, occupancy, blocks, horizon, tasks, rowSpacing]);
  const previous = useMemo(() => buildTimeDistanceModel(territory, EMPTY, previousBlocks, horizon, tasks, rowSpacing), [territory, previousBlocks, horizon, tasks, rowSpacing]);
  const fitView = fitActivityView(model, selectedBlockId, selectedTaskId);
  const [view, setView] = useState(() => fitView);
  const context = JSON.stringify([territory?.territory_id, horizon?.start_time, horizon?.end_time, selectedBlockId, selectedTaskId,
    occupancy.map(row => [row.train_id, row.entry_time, row.exit_time]),
    blocks.map(block => [block.block_id, block.start_time, block.end_time])]);
  const [lastContext, setLastContext] = useState(context);
  if (context !== lastContext) {
    setLastContext(context); setSelectedTrain(""); setHovered(null); setView(fitView);
  }
  if (!model) return <section className="time-distance-card"><p>Load a territory with stations and a valid planning horizon to explore the diagram.</p></section>;
  const bounded = boundView(view.start, view.zoom, model.total);
  const span = model.total / bounded.zoom;
  const plotWidth = TD.width - TD.left - TD.right;
  const x = minute => TD.left + (minute - bounded.start) / span * plotWidth;
  const visible = row => row.end >= bounded.start && row.start <= bounded.start + span;
  const range = row => ({ x: x(Math.max(row.start, bounded.start)), width: Math.max(0, x(Math.min(row.end, bounded.start + span)) - x(Math.max(row.start, bounded.start))) });
  const ticks = Array.from({ length: 7 }, (_, index) => ({
    x: TD.left + plotWidth * index / 6,
    label: new Date(model.start + (bounded.start + span * index / 6) * MINUTE).toTimeString().slice(0, 5),
  }));
  const actualConflicts = conflicts.flatMap(conflict => {
    const section = model.sections.get(conflict.section_id);
    const a = model.stationById.get(section?.from_station), b = model.stationById.get(section?.to_station);
    const start = model.minute(conflict.start_time), end = model.minute(conflict.end_time);
    return a && b && Number.isFinite(start) && Number.isFinite(end) && end > start ? [{ ...conflict, start, end, y: Math.min(a.y, b.y), height: Math.abs(a.y - b.y) }] : [];
  });
  const ghosts = (previous?.possessions ?? []).filter(old => {
    const current = model.possessions.find(block => block.block_id === old.block_id);
    return current && (old.start_time !== current.start_time || old.end_time !== current.end_time || sectionIds(old).join() !== sectionIds(current).join());
  });
  const hasBuffers = model.possessions.some(block => bufferSegments(block).length);
  const active = hovered ?? (selectedTrain ? { kind: "train", id: selectedTrain } : { kind: "block", id: selectedBlockId });
  const trainDetail = active.kind === "train" ? model.trains.find(train => train.trainId === active.id) : null;
  const blockDetail = active.kind === "block" ? model.possessions.find(block => block.block_id === active.id) : null;
  const describe = (kind, id) => ({
    onMouseEnter: () => setHovered({ kind, id }), onMouseLeave: () => setHovered(null),
    onFocus: () => setHovered({ kind, id }), onBlur: () => setHovered(null),
  });
  const chooseBlock = id => { setSelectedTrain(""); setHovered(null); onSelectBlock?.(id); };
  const zoom = factor => {
    const nextZoom = Math.min(TD.maxZoom, Math.max(1, bounded.zoom * factor));
    setView(boundView(bounded.start + span / 2 - model.total / nextZoom / 2, nextZoom, model.total));
  };
  const pan = delta => setView(boundView(bounded.start + delta, bounded.zoom, model.total));
  const clear = () => { setSelectedTrain(""); setHovered(null); onSelectBlock?.(""); };
  const selectedPossession = model.possessions.find(block => block.block_id === selectedBlockId)
    ?? model.possessions.find(block => block.tasks?.includes(selectedTaskId));
  const section = model.sections.get(selectedSection);
  const sectionFrom = model.stationById.get(section?.from_station);
  const sectionTo = model.stationById.get(section?.to_station);
  return <section className={"time-distance-card td-interactive" + (!blocks.length ? " td-baseline" : "")} aria-label="Time-distance possession diagram">
    <div className="workspace-column-heading time-distance-heading"><div>
      <span className="planner-kicker">Route-wide operating picture</span><h2>{blocks.length ? "Time–distance possession diagram" : "Train occupancy baseline"}</h2>
    </div><p>Train paths and planned maintenance possessions on the same route-time axis.</p></div>
    {!blocks.length ? <p className="td-baseline-note">{model.trains.length} timetable services across {model.stations[0].station_name} → {model.stations.at(-1).station_name}. Run the optimizer to overlay proposed maintenance possessions.</p> : null}
    <div className="td-toolbar">
      <div role="group" aria-label="Diagram layers">{["trains", ...(blocks.length ? ["possessions"] : []), ...(hasBuffers ? ["buffers"] : []), ...(actualConflicts.length ? ["conflicts"] : [])].map(layer =>
        <button key={layer} type="button" aria-pressed={layers[layer]} onClick={() => setLayers(current => ({ ...current, [layer]: !current[layer] }))}>{layer[0].toUpperCase() + layer.slice(1)}</button>)}</div>
      <div role="group" aria-label="Diagram view">
        <button type="button" disabled={!selectedPossession} onClick={() => setView(fitActivityView(model, selectedBlockId, selectedTaskId))}>Focus selected</button>
        <button type="button" onClick={() => setView({ start: 0, zoom: 1 })}>Full horizon</button>
        <button type="button" aria-label="Zoom out time" disabled={bounded.zoom <= 1} onClick={() => zoom(0.5)}>−</button>
        <output aria-label="Time zoom">{Number(bounded.zoom.toFixed(1))}×</output>
        <button type="button" aria-label="Zoom in time" disabled={bounded.zoom >= TD.maxZoom} onClick={() => zoom(2)}>+</button>
        <button type="button" aria-label="Pan earlier" disabled={bounded.start <= 0} onClick={() => pan(-span / 4)}>←</button>
        <button type="button" aria-label="Pan later" disabled={bounded.start + span >= model.total} onClick={() => pan(span / 4)}>→</button>
        <button type="button" onClick={() => setView(fitView)}>Reset View</button>
        <button type="button" onClick={clear}>Clear selection</button>
      </div>
    </div>
    <div className="time-distance-legend"><span><i className="td-train" />Timetable path</span>{blocks.length ? <span><i className="td-block" />Solver possession</span> : null}<span><i className="td-selected" />Selected</span>{ghosts.length ? <span>Dashed: previous position</span> : null}</div>
    <div className="time-distance-scroll" tabIndex={0} aria-label="Scrollable time-distance chart">
      <svg className={"time-distance-svg" + (bounded.zoom > 1 ? " is-zoomed" : "")} viewBox={"0 0 " + TD.width + " " + model.height} role="group" aria-label="Interactive time-distance chart"
        onPointerDown={event => {
          if (bounded.zoom <= 1 || event.button !== 0 || event.target.closest('[role="button"]')) return;
          drag.current = { x: event.clientX, start: bounded.start, width: event.currentTarget.getBoundingClientRect().width };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          if (drag.current) setView(boundView(drag.current.start - (event.clientX - drag.current.x) / drag.current.width * TD.width / plotWidth * span, bounded.zoom, model.total));
        }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <defs><clipPath id={clipId}><rect x={TD.left} y={TD.top - 15} width={plotWidth} height={model.height - TD.top} /></clipPath></defs>
        {ticks.map((tick, index) => <g key={index}><line x1={tick.x} y1={TD.top - 20} x2={tick.x} y2={model.height - 24} className="td-grid-time" /><text x={tick.x} y={20} textAnchor="middle" className="td-time-label">{tick.label}</text></g>)}
        {model.stations.map(station => <g key={station.station_id}>
          <line x1={TD.left} y1={model.stationById.get(station.station_id).y} x2={TD.width - TD.right} y2={model.stationById.get(station.station_id).y} className="td-grid-station" />
          <text x={TD.left - 12} y={model.stationById.get(station.station_id).y + 4} textAnchor="end" className="td-station-label">{station.station_name ?? station.station_id}</text>
        </g>)}
        <g clipPath={"url(#" + clipId + ")"}>
          {layers.possessions && ghosts.filter(visible).map(block => <g key={block.block_id} className="td-ghost" aria-hidden="true">{block.bands.map(band => <rect key={band.sectionId} {...range(block)} y={band.top} height={band.height} />)}</g>)}
          {layers.possessions && model.possessions.filter(visible).map(block => <g key={block.block_id}
            className={"td-possession" + (selectedBlockId === block.block_id && !selectedTrain ? " is-selected" : "") + (selectedTrain ? " is-muted" : "")}
            role="button" tabIndex={0} aria-label={"Select possession " + block.block_id} aria-pressed={selectedBlockId === block.block_id && !selectedTrain}
            {...describe("block", block.block_id)} onClick={() => chooseBlock(block.block_id)} onKeyDown={event => activate(event, () => chooseBlock(block.block_id))}>
            <title>{block.block_id + ": " + (block.tasks ?? []).join(", ")}</title>
            {block.bands.map((band, index) => {
              const y = band.top + band.lane * band.height / band.lanes, height = Math.max(3, band.height / band.lanes - 3), window = range(block);
              return <g key={band.sectionId}>
                <rect className="td-window" {...window} y={y} height={height} rx={3} />
                {layers.buffers && bufferSegments(block).filter(visible).map(buffer => <rect key={buffer.kind} className="td-buffer" {...range(buffer)} y={y} height={height}><title>{buffer.kind}</title></rect>)}
                {window.width > 45 && height > 14 ? <text x={window.x + 5} y={y + 14}>{block.block_id}{window.width > 115 && block.integrated ? " · SHARED" : ""}</text> : null}
                {index === 0 && window.width > 60 && height > 34 ? <text className="td-departments" x={window.x + 5} y={y + 31}>{block.departments.map(department => department === "ENGINEERING" ? "ENG" : department).join(" · ")}</text> : null}
              </g>;
            })}
          </g>)}
          {layers.trains && model.trains.map(train => {
            const segments = train.segments.filter(visible);
            if (!segments.length) return null;
            const path = segments.map(row => "M " + x(row.start) + "," + row.y1 + " L " + x(row.end) + "," + row.y2).join(" ");
            return <g key={train.trainId} className={"td-train-group" + (selectedTrain === train.trainId ? " is-selected" : selectedTrain ? " is-muted" : "")}
              role="button" tabIndex={0} aria-label={"Select train " + train.number + (train.name ? " · " + train.name : "")} aria-pressed={selectedTrain === train.trainId}
              {...describe("train", train.trainId)} onClick={() => setSelectedTrain(train.trainId)} onKeyDown={event => activate(event, () => setSelectedTrain(train.trainId))}>
              <title>{train.number + (train.name ? " · " + train.name : "")}</title><path className="td-train-hit" d={path} /><path className="td-train-path" d={path} />
              {segments.filter(row => row.end >= bounded.start && row.end <= bounded.start + span).slice(-1).map((row, index) =>
                <text key={index} className="td-train-end-label" x={x(row.end) - 4} y={row.y2 - 6} textAnchor="end">{train.number}</text>)}
            </g>;
          })}
          {layers.conflicts && actualConflicts.filter(visible).map((conflict, index) => <rect key={index} className="td-conflict" {...range(conflict)} y={conflict.y} height={conflict.height}><title>{conflict.reason ?? "Recorded conflict"}</title></rect>)}
        </g>
        {selectedSection ? <text x={TD.width - TD.right} y={model.height - 7} textAnchor="end" className="td-scope-label">Focused section: {sectionFrom && sectionTo ? `${sectionFrom.station_name} → ${sectionTo.station_name}` : selectedSection}</text> : null}
      </svg>
    </div>
    <div className="td-pan"><label>Time position <input aria-label="Time position" type="range" min={0} max={Math.max(0, model.total - span)} step="any" value={bounded.start} disabled={bounded.zoom === 1} onChange={event => setView(boundView(Number(event.target.value), bounded.zoom, model.total))} /></label><span>Zoom then drag empty chart space or use arrows. Page scrolling stays normal.</span></div>
    <div className="td-details" role="region" aria-label={trainDetail ? "Train details" : blockDetail ? "Possession details" : "Diagram details"} aria-live="polite">
      {trainDetail ? <TrainFacts train={trainDetail} blocks={model.possessions} /> : blockDetail ? <BlockFacts block={{ ...blockDetail, sectionNames: sectionIds(blockDetail).map(id => {
        const row = model.sections.get(id), from = model.stationById.get(row?.from_station), to = model.stationById.get(row?.to_station);
        return from && to ? `${from.station_name} → ${to.station_name} (${id})` : id;
      }) }} /> : <p>Hover, focus or select a train / possession. Click or tap to keep its details here.</p>}
    </div>
    {!actualConflicts.length ? <p className="td-data-note">No explicit conflict records supplied; this does not certify an absence of conflicts.</p> : null}
  </section>;
}
