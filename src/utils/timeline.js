export function timestampValue(timestamp) {
  if (!timestamp) return 0;
  let s = String(timestamp).trim();
  s = s.replace(/(:[0-9]{2}):[0-9]{2}$/, "$1");
  // If string has no timezone indicator, treat as UTC to prevent local-timezone skew
  if (!s.endsWith("Z") && !/[+-][0-9]{2}(:?[0-9]{2})?$/.test(s)) {
    s += "Z";
  }
  const val = new Date(s).getTime();
  return isNaN(val) ? (new Date(timestamp).getTime() || 0) : val;
}

export function timeLabel(timestamp) {
  if (!timestamp) return "";
  const s = String(timestamp);
  if (s.includes("T")) {
    return s.split("T")[1].slice(0, 5);
  }
  return s.slice(0, 5);
}

export function dateLabel(timestamp) {
  if (!timestamp) return "Planning horizon";
  const ms = timestampValue(timestamp);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
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
        ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).format(timestamp)
        : timestamp.toISOString().slice(11, 16),
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
  const horizonStart = timestampValue(horizon?.start_time);
  const horizonEnd = timestampValue(horizon?.end_time);
  const duration = Math.max(1, horizonEnd - horizonStart);
  const itemStart = timestampValue(startTime);
  const itemEnd = timestampValue(endTime);
  const start = Math.max(horizonStart, itemStart);
  const end = Math.min(horizonEnd, itemEnd);
  const rawWidth = Math.max(0, end - start) / duration;
  const leftPct = ((start - horizonStart) / duration) * 100;
  // Ensure minimum visual presence (0.8%) so short events and possessions are always visible
  const widthPct = Math.max(0.8, rawWidth * 100);
  return {
    left: `${Math.max(0, Math.min(100, leftPct))}%`,
    width: `${Math.max(0.8, Math.min(100 - leftPct, widthPct))}%`,
  };
}
