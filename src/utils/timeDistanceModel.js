// Presentation-only geometry. No scheduling, conflict inference or solver rules.
export const TD = { width: 1040, left: 210, right: 28, top: 46, row: 76, maxZoom: 32 };
export const MINUTE = 60000;
export const sectionIds = (block) => block.section_ids?.length ? block.section_ids : [block.section_id].filter(Boolean);
const finiteTime = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));

export function buildTimeDistanceModel(territory, occupancy, blocks, horizon, tasks = [], rowSpacing = TD.row) {
  if (!territory || !finiteTime(horizon?.start_time) || !finiteTime(horizon?.end_time)) return null;
  const start = Date.parse(horizon.start_time), total = (Date.parse(horizon.end_time) - start) / MINUTE;
  if (total <= 0) return null;
  const stations = [...(territory.stations ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (stations.length < 2) return null;
  const stationById = new Map(stations.map((station, index) => [station.station_id, { ...station, index, y: TD.top + index * rowSpacing }]));
  const sections = new Map((territory.sections ?? []).map((section) => [section.section_id, section]));
  const services = new Map((territory.train_services ?? []).map((service) => [service.train_id, service]));
  const taskById = new Map(tasks.map((task) => [task.task_id, task]));
  const minute = (value) => (Date.parse(value) - start) / MINUTE;
  const trains = new Map();
  for (const row of occupancy) {
    const section = sections.get(row.section_id);
    if (!section || !finiteTime(row.entry_time) || !finiteTime(row.exit_time) || Date.parse(row.exit_time) < Date.parse(row.entry_time)) continue;
    const from = stationById.get(section.from_station), to = stationById.get(section.to_station);
    if (!from || !to) continue;
    const service = services.get(row.train_id);
    const sequence = service?.station_sequence ?? [];
    const fromOrder = sequence.indexOf(section.from_station), toOrder = sequence.indexOf(section.to_station);
    const knownDirection = fromOrder >= 0 && toOrder >= 0 && fromOrder !== toOrder;
    const entry = fromOrder < toOrder ? from : to, exit = fromOrder < toOrder ? to : from;
    if (!trains.has(row.train_id)) trains.set(row.train_id, {
      trainId: row.train_id, number: service?.service_number ?? row.train_id,
      name: service?.service_name, direction: service?.direction ?? row.direction,
      segments: [],
    });
    trains.get(row.train_id).segments.push({
      ...row, start: minute(row.entry_time), end: minute(row.exit_time), knownDirection,
      from: knownDirection ? entry : null, to: knownDirection ? exit : null,
      y1: knownDirection ? entry.y : (from.y + to.y) / 2,
      y2: knownDirection ? exit.y : (from.y + to.y) / 2,
    });
  }
  const possessions = blocks.filter((block) => finiteTime(block.start_time) && finiteTime(block.end_time) && Date.parse(block.end_time) > Date.parse(block.start_time)).map((block) => ({
    ...block, start: minute(block.start_time), end: minute(block.end_time),
    taskDetails: (block.tasks ?? []).map((id) => taskById.get(id) ?? { task_id: id }),
    departments: [...new Set((block.tasks ?? []).map((id) => taskById.get(id)?.department).filter(Boolean))],
    bands: sectionIds(block).flatMap((id) => {
      const section = sections.get(id);
      const a = stationById.get(section?.from_station), b = stationById.get(section?.to_station);
      return a && b ? [{ sectionId: id, top: Math.min(a.y, b.y) + 6, height: Math.abs(a.y - b.y) - 12, lane: 0, lanes: 1 }] : [];
    }),
  })).filter((block) => block.bands.length);
  // Distinct simultaneous possessions get distinct visual lanes within their
  // actual section/time footprint. This never combines or changes solver blocks.
  for (const id of sections.keys()) {
    const rows = possessions.filter((block) => block.bands.some((band) => band.sectionId === id)).sort((a, b) => a.start - b.start || a.block_id.localeCompare(b.block_id));
    const ends = [];
    for (const block of rows) {
      let lane = ends.findIndex((end) => end <= block.start);
      if (lane < 0) lane = ends.length;
      ends[lane] = block.end;
      block.bands.find((band) => band.sectionId === id).lane = lane;
    }
    for (const block of rows) block.bands.find((band) => band.sectionId === id).lanes = ends.length;
  }
  return { start, total, stations, stationById, sections, trains: [...trains.values()], possessions, minute,
    height: TD.top * 2 + (stations.length - 1) * rowSpacing };
}

export function boundView(start, zoom, total) {
  const boundedZoom = Math.min(TD.maxZoom, Math.max(1, zoom));
  return { zoom: boundedZoom, start: Math.min(Math.max(0, start), Math.max(0, total - total / boundedZoom)) };
}

// Presentation-only viewport fit. All source data remains available through Full horizon.
export function fitActivityView(model, selectedBlockId, selectedTaskId) {
  if (!model) return { start: 0, zoom: 1 };
  const selected = model.possessions.find(block => block.block_id === selectedBlockId)
    ?? model.possessions.find(block => block.tasks?.includes(selectedTaskId));
  let rows;
  let padding;
  if (selected) {
    rows = [selected];
    padding = 18;
  } else {
    rows = [...model.trains.flatMap(train => train.segments), ...model.possessions];
    padding = 20;
  }
  if (!rows.length) return { start: 0, zoom: 1 };
  const first = Math.max(0, Math.min(...rows.map(row => row.start)) - padding);
  const last = Math.min(model.total, Math.max(...rows.map(row => row.end)) + padding);
  const span = Math.max(1, last - first);
  return boundView(first, model.total / span, model.total);
}

export function bufferSegments(block) {
  const duration = block.end - block.start;
  const setup = block.setup_minutes, release = block.release_minutes;
  const segments = [];
  if (Number.isFinite(setup) && setup > 0 && setup <= duration) segments.push({ kind: "Setup", start: block.start, end: block.start + setup });
  if (Number.isFinite(release) && release > 0 && release <= duration) segments.push({ kind: "Release", start: block.end - release, end: block.end });
  // No default buffer values: a layer is drawn only for explicit input fields.
  return segments;
}
