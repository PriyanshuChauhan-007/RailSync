export function timestampValue(timestamp) {
  return new Date(timestamp).getTime();
}

export function timeLabel(timestamp) {
  return timestamp?.split("T")[1]?.slice(0, 5) ?? "";
}

export function dateLabel(timestamp) {
  if (!timestamp) return "Planning horizon";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function durationMinutes(startTime, endTime) {
  return Math.round((timestampValue(endTime) - timestampValue(startTime)) / 60_000);
}

export function buildTicks(horizon) {
  if (!horizon) return [];
  const start = timestampValue(horizon.start_time);
  const end = timestampValue(horizon.end_time);
  const hours = Math.max(1, (end - start) / 3_600_000);
  const intervals = Math.min(8, Math.max(1, Math.ceil(hours)));
  return Array.from({ length: intervals + 1 }, (_, index) => {
    const timestamp = new Date(start + ((end - start) * index) / intervals);
    return {
      key: timestamp.toISOString(),
      label: hours > 24
        ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(timestamp)
        : timestamp.toTimeString().slice(0, 5),
      left: `${(index / intervals) * 100}%`,
    };
  });
}

export function intervalDensity(startTime, endTime, horizon) {
  const total = Math.max(1, durationMinutes(horizon.start_time, horizon.end_time));
  const percentage = (durationMinutes(startTime, endTime) / total) * 100;
  if (percentage >= 8) return "wide";
  if (percentage >= 3) return "medium";
  return "narrow";
}

export function intervalLabelFits(startTime, endTime, horizon, label) {
  const total = Math.max(1, durationMinutes(horizon.start_time, horizon.end_time));
  const percentage = (durationMinutes(startTime, endTime) / total) * 100;
  const usableCharacters = Math.floor(Math.max(0, percentage - 1) * 0.85);
  return String(label ?? "").trim().length <= usableCharacters;
}

export function rangeStyle(startTime, endTime, horizon) {
  const horizonStart = timestampValue(horizon.start_time);
  const horizonEnd = timestampValue(horizon.end_time);
  const duration = horizonEnd - horizonStart;
  const start = Math.max(horizonStart, timestampValue(startTime));
  const end = Math.min(horizonEnd, timestampValue(endTime));
  return {
    left: `${((start - horizonStart) / duration) * 100}%`,
    width: `${(Math.max(0, end - start) / duration) * 100}%`,
  };
}
