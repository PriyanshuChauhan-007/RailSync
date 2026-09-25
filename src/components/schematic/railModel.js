export const clockLabel = (time) => time?.slice(11, 16) ?? "";
export const deptLabel = (dept) => (dept === "ENGINEERING" ? "ENG" : dept);

export function stationLayout(territory) {
  const stations = [...(territory?.stations ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  return stations.map((station, index) => ({
    ...station,
    x: 80 + (index * 1040) / Math.max(1, stations.length - 1),
  }));
}

// Direction comes from ordered station sequence or explicit configuration
export function trainModels(territory, occupancy = []) {
  const stations = stationLayout(territory);
  const rows = Array.isArray(occupancy) ? occupancy : [];
  const uniqueIds = [...new Set(rows.map((row) => row.train_id))].filter(Boolean);

  if (uniqueIds.length > 0) {
    return uniqueIds.map((id, index) => {
      const service = territory?.train_services?.find((item) => item.train_id === id);
      const sequence = (service?.station_sequence ?? []).filter((st) =>
        stations.some((item) => item.station_id === st),
      );
      const first = stations.findIndex((st) => st.station_id === sequence[0]);
      const last = stations.findIndex((st) => st.station_id === sequence.at(-1));
      let direction =
        first >= 0 && last !== first
          ? Math.sign(last - first)
          : service?.direction === "SOUTHBOUND" || service?.direction === "DOWN"
          ? 1
          : service?.direction === "NORTHBOUND" || service?.direction === "UP"
          ? -1
          : index % 2 === 0
          ? 1
          : -1;
      if (!direction) direction = index % 2 === 0 ? 1 : -1;

      const trainRows = rows
        .filter((row) => row.train_id === id)
        .sort((a, b) => (a.entry_time || "").localeCompare(b.entry_time || ""));
      const startTime = trainRows[0]?.entry_time ? new Date(trainRows[0].entry_time) : new Date();
      const endTime = trainRows.at(-1)?.exit_time
        ? new Date(trainRows.at(-1).exit_time)
        : startTime;
      const minutes = Math.max(0, (endTime - startTime) / 60000);
      return {
        id,
        label: service?.service_number ?? id,
        direction,
        rows: trainRows,
        duration: Math.min(34, Math.max(16, 14 + minutes / 6)),
      };
    });
  }

  // Fallback to activeTrains or train_services if occupancy is empty
  const activeList = territory?.activeTrains || territory?.train_services || [];
  return activeList.slice(0, 4).map((item, idx) => ({
    id: item.id || item.train_id || `TR-${idx}`,
    label: item.label || item.service_number || item.train_id || `TR-${idx}`,
    direction: item.direction ?? (idx % 2 === 0 ? 1 : -1),
    rows: [],
    duration: 18 + idx * 4,
  }));
}

export function representativeTrains(territory, occupancy = []) {
  const trains = trainModels(territory, occupancy);
  if (!trains.length) return [];
  const first = trains[0];
  const opposite = trains.find((train) => train?.direction && train.direction !== first?.direction);
  return [first, opposite, ...trains]
    .filter(
      (train, index, list) =>
        train && list.findIndex((item) => item?.id === train.id) === index,
    )
    .slice(0, 4);
}

export function sectionExtent(territory, sectionIds = []) {
  const stations = stationLayout(territory);
  const sections = (territory?.sections ?? []).filter((section) =>
    (sectionIds || []).includes(section.section_id),
  );
  const points = sections
    .flatMap((section) => [section.from_station, section.to_station])
    .map((id) => stations.find((station) => station.station_id === id)?.x)
    .filter(Number.isFinite);
  return points.length
    ? { x: Math.min(...points), width: Math.max(40, Math.max(...points) - Math.min(...points)) }
    : { x: 80, width: 200 };
}

export function corridorExample(corridor) {
  const tasks = corridor?.tasks ?? [];
  const task =
    tasks.find((item) => item.department === "ENGINEERING") ??
    tasks[0] ?? {
      task_id: "T-01",
      department: "ENGINEERING",
      task_type: "TRACK",
      duration_minutes: 120,
      section_id: corridor?.sections?.[0]?.section_id || "SEC-1",
    };
  const partner = tasks.find(
    (item) =>
      item.task_id !== task.task_id &&
      item.section_id === task.section_id &&
      item.compatibility_group === task.compatibility_group,
  );
  const trains = (corridor?.trains ?? []).filter((row) => row.section_id === task.section_id);
  const train =
    trains[0] ?? {
      train_id: corridor?.activeTrains?.[0]?.id || "12050",
      entry_time: "2026-09-25T10:00:00",
      exit_time: "2026-09-25T11:00:00",
    };
  return {
    task,
    partner,
    train,
    extent: sectionExtent(corridor, [task.section_id]) ?? { x: 80, width: 200 },
  };
}
