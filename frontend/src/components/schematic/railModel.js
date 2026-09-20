export const clockLabel = (time) => time?.slice(11, 16) ?? "";
export const deptLabel = (dept) => dept === "ENGINEERING" ? "ENG" : dept;

export function stationLayout(territory) {
  const stations = [...(territory.stations ?? [])].sort((a, b) => a.order - b.order);
  return stations.map((station, index) => ({ ...station, x: 80 + index * 1040 / Math.max(1, stations.length - 1) }));
}

// Direction comes from ordered station IDs, never from an assumed compass direction.
export function trainModels(territory, occupancy) {
  const stations = stationLayout(territory);
  return [...new Set(occupancy.map((row) => row.train_id))].map((id) => {
    const service = territory.train_services?.find((item) => item.train_id === id);
    const sequence = (service?.station_sequence ?? []).filter((station) => stations.some((item) => item.station_id === station));
    const first = stations.findIndex((station) => station.station_id === sequence[0]);
    const last = stations.findIndex((station) => station.station_id === sequence.at(-1));
    const direction = first >= 0 && last !== first ? Math.sign(last - first) : 0;
    const rows = occupancy.filter((row) => row.train_id === id).sort((a, b) => a.entry_time.localeCompare(b.entry_time));
    const minutes = (new Date(rows.at(-1).exit_time) - new Date(rows[0].entry_time)) / 60000;
    return { id, label: service?.service_number ?? id, direction, rows, duration: Math.min(34, Math.max(18, 16 + minutes / 5)) };
  });
}

export function representativeTrains(territory, occupancy) {
  const trains = trainModels(territory, occupancy);
  const first = trains[0];
  const opposite = trains.find((train) => train.direction && train.direction !== first?.direction);
  return [first, opposite, ...trains].filter((train, index, list) => train && list.findIndex((item) => item?.id === train.id) === index).slice(0, 3);
}

export function sectionExtent(territory, sectionIds) {
  const stations = stationLayout(territory);
  const sections = territory.sections.filter((section) => sectionIds.includes(section.section_id));
  const points = sections.flatMap((section) => [section.from_station, section.to_station]).map((id) => stations.find((station) => station.station_id === id)?.x).filter(Number.isFinite);
  return points.length ? { x: Math.min(...points), width: Math.max(...points) - Math.min(...points) } : null;
}

export function corridorExample(corridor) {
  const task = corridor.tasks.find((item) => item.department === "ENGINEERING") ?? corridor.tasks[0];
  const partner = corridor.tasks.find((item) => item.task_id !== task.task_id && item.section_id === task.section_id && item.compatibility_group === task.compatibility_group);
  const trains = corridor.trains.filter((row) => row.section_id === task.section_id);
  const train = trains.find((row) => row.train_id === "37814") ?? trains[0];
  return { task, partner, train, extent: sectionExtent(corridor, [task.section_id]) };
}
