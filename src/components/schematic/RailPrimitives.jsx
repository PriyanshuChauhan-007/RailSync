import { useId } from "react";
import { deptLabel, sectionExtent, stationLayout } from "./railModel.js";

export function TrainRakeSvg({ label, reverse = false }) {
  const text = `${label ?? ""}${reverse ? " ←" : " →"}`;
  const labelWidth = Math.max(72, text.length * 7.5 + 16);
  const labelX = -24 - labelWidth / 2;

  return <g className="rn-rake">
    <g transform={reverse ? "scale(-1 1)" : undefined}>
      {[-92, -62, -32].map((x) => <g key={x}>
        <rect x={x} y="-20" width="27" height="17" rx="3" className="rn-coach" />
        <path d={`M${x + 4} -17h18v5h-18Z`} className="rn-windows" />
        <path d={`M${x + 7} -11v7m7-7v7`} className="rn-coach-lines" />
        <circle cx={x + 6} cy="-2" r="2.5" /><circle cx={x + 21} cy="-2" r="2.5" />
      </g>)}
      <path d="M0-20H22L35-9V-3H0Z" className="rn-locomotive" />
      <path d="M20-17 28-10H19Z" className="rn-windows" />
      <circle cx="7" cy="-2" r="2.5" /><circle cx="26" cy="-2" r="2.5" />
      <path d="M-6-6H0M-36-6h4M-66-6h4" className="rn-coupling" />
    </g>
    <rect x={labelX} y="-41" width={labelWidth} height="18" rx="4" className="rn-train-label-bg" />
    <text x="-24" y="-28" textAnchor="middle" className="rn-train-id">{text}</text>
  </g>;
}

export function RailTrain({ train, index = 0, moving = true }) {
  const reverse = train.direction === -1;
  return <g transform={`translate(0 ${reverse ? 142 : 116})`}>
    <g className={moving && train.direction ? "rn-moving-train" : "rn-static-train"}
      data-train={train.id} data-direction={train.direction}
      style={{ "--travel-start": `${reverse ? 1320 : -80}px`, "--travel-end": `${reverse ? -80 : 1320}px`, "--parked": `${220 + index * 315}px`, animationDuration: `${train.duration}s`, animationDelay: `${-train.duration * (.22 + index * .29)}s` }}>
      <rect x={reverse ? -25 : -117} y="-2" width="143" height="7" rx="3" className="rn-moving-occupancy" />
      <TrainRakeSvg label={train.label} reverse={reverse} />
    </g>
  </g>;
}

export function RailTrack({ territory, onSection, selectedSection }) {
  const pattern = useId().replaceAll(":", "");
  return <g className="rn-track" data-testid={`track-${territory?.territory_id ?? "unknown"}`}>
    <defs><pattern id={pattern} width="12" height="12" patternUnits="userSpaceOnUse"><path d="M2 0V12" stroke="currentColor" strokeWidth="2" /></pattern></defs>
    <path d="M42 149H1160L1172 162H54Z" className="rn-track-depth" />
    {[116, 142].map((y) => <g key={y}>
      <rect x="40" y={y - 6} width="1120" height="12" fill={`url(#${pattern})`} className="rn-sleepers" />
      <path d={`M40 ${y - 4}H1160M40 ${y + 4}H1160`} className="rn-rails" />
    </g>)}
    {(territory?.sections ?? []).map((section, idx) => {
      const extent = sectionExtent(territory, [section.section_id]);
      if (!extent) return null;
      return <rect key={section.section_id ?? `sec-${idx}`} x={extent.x} width={extent.width} y="106" height="47" rx="3"
        className={`rn-section-hit ${selectedSection === section.section_id ? "is-selected" : ""}`}
        role={onSection ? "button" : undefined} tabIndex={onSection ? 0 : undefined}
        aria-label={onSection ? `Inspect section ${section.section_id}` : undefined}
        onClick={() => onSection?.(section.section_id)} onKeyDown={(event) => {
          if (onSection && ["Enter", " "].includes(event.key)) { event.preventDefault(); onSection(section.section_id); }
        }}><title>{section.section_id}</title></rect>;
    })}
  </g>;
}

export function RailStations({ territory, onStation }) {
  return <g className="rn-stations">{stationLayout(territory).map((station, index) => <g key={station.station_id ?? `stn-${index}`}
    transform={`translate(${station.x} 0)`} role={onStation ? "button" : undefined} tabIndex={onStation ? 0 : undefined}
    aria-label={onStation ? `Inspect station ${station.station_name}` : undefined}
    onClick={() => onStation?.(station.station_id)} onKeyDown={(event) => {
      if (onStation && ["Enter", " "].includes(event.key)) { event.preventDefault(); onStation(station.station_id); }
    }}>
    <path d="M-12 130 0 125 12 130 0 135Z" className="rn-platform" /><circle cy="129" r="4" />
    <path d={`M0 102V${index % 2 ? 63 : 48}`} className="rn-station-stem" />
    <text y={index % 2 ? 59 : 44} textAnchor="middle" className="rn-station-name">{station.station_name}</text>
    <text y="176" textAnchor="middle" className="rn-station-code">{station.station_id}</text>
  </g>)}</g>;
}

export function MaintenanceMarker({ task, x, y = 208, index = 0, merging = false }) {
  const text = `${deptLabel(task.department)} · ${task.duration_minutes} min`;
  const markerWidth = Math.max(110, text.length * 7.5 + 20);
  return <g className={`rn-maintenance rn-dept-${task.department === "ENGINEERING" ? "eng" : task.department === "TRD" ? "trd" : "snt"} ${merging ? `rn-merge rn-merge-${index}` : "rn-attach"}`}
    style={{ "--task-x": `${x}px`, "--task-y": `${y}px`, animationDelay: `${index * .15}s` }}>
    <rect x={-markerWidth / 2} y="-14" width={markerWidth} height="28" rx="5" />
    <text textAnchor="middle" y="5">{text}</text>
    <title>{task.task_id} · {task.task_type} · {task.duration_minutes} min</title>
  </g>;
}

export function PossessionBlock({ x, width, label, className = "", y = 116 }) {
  const blockWidth = Math.max(width, (label?.length || 0) * 8 + 20);
  return <g className={`rn-possession ${className}`} transform={`translate(${x} ${y})`}>
    <path d={`M0-12H${blockWidth - 10}L${blockWidth}-3H10Z`} className="rn-possession-top" />
    <rect x="10" y="-3" width={Math.max(10, blockWidth - 10)} height="24" rx="2" />
    <text x={blockWidth / 2} y="13" textAnchor="middle">{label}</text>
  </g>;
}

export function RailCallout({ title, detail, x = 540, anchor = 210, tone = "" }) {
  return <g className={`rn-callout ${tone}`}>
    <path d={`M${anchor} 146V197H${x - 10}`} className="rn-connector" /><circle cx={anchor} cy="146" r="4" />
    <rect x={x} y="178" width="570" height="50" rx="5" />
    <text x={x + 15} y="198" className="rn-callout-title">{title}</text><text x={x + 15} y="217" className="rn-callout-detail">{detail}</text>
  </g>;
}
