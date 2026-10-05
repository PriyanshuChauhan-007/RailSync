export function parseUtcTimestamp(timestamp) {
  if (!timestamp) return 0;
  if (typeof timestamp === "number") return timestamp;
  const match = String(timestamp).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, y, m, d, hr, mn, sec] = match;
    return Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hr), Number(mn), Number(sec || 0));
  }
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function timestampValue(timestamp) {
  return parseUtcTimestamp(timestamp);
}

export function timeLabel(timestamp) {
  return timestamp?.split("T")[1]?.slice(0, 5) ?? "";
}

export function dateLabel(timestamp) {
  if (!timestamp) return "Planning horizon";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(parseUtcTimestamp(timestamp)));
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
    const timeMs = start + ((end - start) * index) / intervals;
    const dateUtc = new Date(timeMs);
    const hoursStr = String(dateUtc.getUTCHours()).padStart(2, "0");
    const minsStr = String(dateUtc.getUTCMinutes()).padStart(2, "0");
    return {
      key: dateUtc.toISOString(),
      label: hours > 24
        ? new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short" }).format(dateUtc)
        : `${hoursStr}:${minsStr}`,
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
