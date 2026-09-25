import { canonicalTrainId, trainLabel } from "../../utils/planningLabels.js";
import "./timeline.css";

export function TimelineGrid({ ticks, className = "timeline-grid" }) {
  return (
    <span className={className} aria-hidden="true">
      {ticks.map((tick) => <i key={tick.key} style={{ left: tick.left }} />)}
    </span>
  );
}

export function OperationalTrainMarker({ train, territory, compact = false }) {
  const service = canonicalTrainId(train.train_id);
  const direction = train.direction ? ` · ${train.direction}` : "";
  return (
    <span
      className={`operational-train-marker${compact ? " is-compact" : ""}`}
      title={`${trainLabel(train.train_id, territory)}${direction}`}
      aria-hidden="true"
    >
      <span className="operational-train-glyph">⇄</span>
      <span>{service}{compact ? "" : direction}</span>
    </span>
  );
}
