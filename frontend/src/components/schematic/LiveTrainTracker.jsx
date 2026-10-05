import { useMemo, useState } from "react";
import TopMasterClock from "../ui/TopMasterClock.jsx";

// 4-Aspect Signal visual component
function FourAspectSignal({ aspect = "GREEN", label, x, y }) {
  // Aspects: RED, YELLOW, DOUBLE_YELLOW, GREEN
  const aspectsConfig = {
    RED: { top: "#222", mid1: "#222", mid2: "#222", bottom: "#ef4444", glow: "#ef4444" },
    YELLOW: { top: "#222", mid1: "#eab308", mid2: "#222", bottom: "#222", glow: "#eab308" },
    DOUBLE_YELLOW: { top: "#eab308", mid1: "#222", mid2: "#eab308", bottom: "#222", glow: "#eab308" },
    GREEN: { top: "#222", mid1: "#22c55e", mid2: "#222", bottom: "#222", glow: "#22c55e" },
  };
  const current = aspectsConfig[aspect] || aspectsConfig.GREEN;

  return (
    <g transform={`translate(${x}, ${y})`} className="signal-aspect-post" aria-label={`Signal ${label}: ${aspect}`}>
      {/* Post */}
      <line x1="0" y1="0" x2="0" y2="28" stroke="var(--border-color, #475569)" strokeWidth="3" />
      {/* Signal Head box */}
      <rect x="-7" y="-28" width="14" height="28" rx="3" fill="#0b0f19" stroke="var(--border-color, #334155)" strokeWidth="1" />
      {/* 4 Lamps from top to bottom */}
      <circle cx="0" cy="-24" r="2.5" fill={current.top} style={current.top !== "#222" ? { filter: `drop-shadow(0 0 4px ${current.glow})` } : undefined} />
      <circle cx="0" cy="-18" r="2.5" fill={current.mid1} style={current.mid1 !== "#222" ? { filter: `drop-shadow(0 0 4px ${current.glow})` } : undefined} />
      <circle cx="0" cy="-12" r="2.5" fill={current.mid2} style={current.mid2 !== "#222" ? { filter: `drop-shadow(0 0 4px ${current.glow})` } : undefined} />
      <circle cx="0" cy="-6" r="2.5" fill={current.bottom} style={current.bottom !== "#222" ? { filter: `drop-shadow(0 0 4px ${current.glow})` } : undefined} />
      {label && (
        <text x="0" y="38" textAnchor="middle" fill="var(--text-muted, #94a3b8)" fontSize="8" fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  );
}

export default function LiveTrainTracker({
  territory,
  trains = [],
  blocks = [],
  selectedSection,
  onSelectSection,
}) {
  const [simMinutes, setSimMinutes] = useState(480); // 08:00
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  const stations = territory?.stations || [];
  const sections = territory?.sections || [];
  const totalLengthKm = stations.length > 0 ? (stations[stations.length - 1].chainage_km || 200) : 200;

  const WIDTH = 1000;
  const PAD_X = 60;
  const TRACK_WIDTH = WIDTH - PAD_X * 2;

  // Station positions
  const stationX = useMemo(() => {
    return stations.map((st, idx) => {
      const frac = totalLengthKm > 0 ? (st.chainage_km || (idx / Math.max(1, stations.length - 1)) * totalLengthKm) / totalLengthKm : idx / Math.max(1, stations.length - 1);
      return {
        ...st,
        x: PAD_X + frac * TRACK_WIDTH,
      };
    });
  }, [stations, totalLengthKm, TRACK_WIDTH]);

  // Derive occupied sections from maintenance blocks and active trains
  const sectionOccupancy = useMemo(() => {
    const occ = {};
    sections.forEach((sec) => {
      occ[sec.section_id] = { hasBlock: false, trains: [] };
    });

    // Check blocks
    blocks.forEach((blk) => {
      const sIds = blk.section_ids || (blk.section_id ? [blk.section_id] : []);
      sIds.forEach((sId) => {
        if (occ[sId]) occ[sId].hasBlock = true;
      });
    });

    // Determine trains active near current simMinutes
    const currentTimeStr = `${String(Math.floor(simMinutes / 60) % 24).padStart(2, "0")}:${String(Math.floor(simMinutes % 60)).padStart(2, "0")}`;
    trains.forEach((t) => {
      const entryMins = t.entry_time ? parseInt(t.entry_time.slice(11, 13) || "0", 10) * 60 + parseInt(t.entry_time.slice(14, 16) || "0", 10) : 0;
      const exitMins = t.exit_time ? parseInt(t.exit_time.slice(11, 13) || "0", 10) * 60 + parseInt(t.exit_time.slice(14, 16) || "0", 10) : 0;
      const effectiveExit = exitMins < entryMins ? exitMins + 1440 : exitMins;
      const checkMins = simMinutes < entryMins && effectiveExit > 1440 ? simMinutes + 1440 : simMinutes;

      if (checkMins >= entryMins - 15 && checkMins <= effectiveExit + 15) {
        if (occ[t.section_id]) {
          occ[t.section_id].trains.push(t);
        }
      }
    });

    return occ;
  }, [sections, blocks, trains, simMinutes]);

  // Compute 4-aspect signal states along UP and DN lines
  // Cascades Green -> Double Yellow -> Yellow -> Red upstream of occupancy
  const signalAspects = useMemo(() => {
    const aspects = {};
    const n = sections.length;
    for (let i = 0; i < n; i++) {
      const sec = sections[i];
      const isOccupied = sectionOccupancy[sec.section_id]?.hasBlock || (sectionOccupancy[sec.section_id]?.trains?.length > 0);
      if (isOccupied) {
        aspects[sec.section_id] = "RED";
      } else if (i > 0 && aspects[sections[i - 1]?.section_id] === "RED") {
        aspects[sec.section_id] = "YELLOW";
      } else if (i > 1 && aspects[sections[i - 2]?.section_id] === "RED") {
        aspects[sec.section_id] = "DOUBLE_YELLOW";
      } else {
        aspects[sec.section_id] = "GREEN";
      }
    }
    return aspects;
  }, [sections, sectionOccupancy]);

  // Position active train rakes with 3x accelerated baseline glide
  const activeTrains = useMemo(() => {
    const rawServices = territory?.train_services?.length
      ? territory.train_services
      : [
          { service_number: "12050", service_name: "12050 Gatimaan Exp", speed_kmh: 160, direction: "SOUTHBOUND" },
          { service_number: "22436", service_name: "22436 Vande Bharat", speed_kmh: 130, direction: "NORTHBOUND" },
          { service_number: "12002", service_name: "12002 Bhopal Shatabdi", speed_kmh: 130, direction: "SOUTHBOUND" },
        ];
    return rawServices.map((service, idx) => {
      const isUp = service.direction === "NORTHBOUND" || service.direction === "UP" || idx % 2 === 1;
      const speedKmh = service.speed_kmh || (service.traffic_type === "PASSENGER" ? 130 : 80);
      // 3x baseline velocity glide based on simMinutes
      const cyclePeriodMins = Math.max(30, (totalLengthKm / speedKmh) * 60 / 3);
      const offset = (idx * 27) % cyclePeriodMins;
      const progress = ((simMinutes + offset) % cyclePeriodMins) / cyclePeriodMins;
      const x = isUp
        ? PAD_X + (1 - progress) * TRACK_WIDTH
        : PAD_X + progress * TRACK_WIDTH;
      return {
        ...service,
        isUp,
        x,
        trackY: isUp ? 85 : 165,
      };
    });
  }, [territory, totalLengthKm, simMinutes, TRACK_WIDTH]);

  return (
    <div
      className="live-train-tracker-panel"
      style={{
        backgroundColor: "var(--track-canvas-bg, #0b0f19)",
        border: "1px solid var(--border-color, #334155)",
        borderRadius: "10px",
        padding: "16px",
        marginBottom: "20px",
        position: "relative",
      }}
    >
      {/* Live OCC Dispatch Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "12px",
          paddingBottom: "8px",
          borderBottom: "1px solid var(--border-subtle, #1e293b)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.06em",
            color: "var(--accent-kpi-blue, #38bdf8)",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              boxShadow: "0 0 8px #22c55e",
              display: "inline-block",
            }}
          />
          ● LIVE OCC DISPATCH FEED | 4-ASPECT AUTOMATIC BLOCK INTERLOCKING | ACTIVE RESOLVER
        </span>

        <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)", fontFamily: "monospace" }}>
          {territory?.territory_id?.toUpperCase()} HDN CORRIDOR · {totalLengthKm} KM
        </span>
      </div>

      {/* TopMasterClock Controller */}
      <TopMasterClock
        simMinutes={simMinutes}
        onTimeChange={setSimMinutes}
        isPlaying={isPlaying}
        onPlayPauseToggle={setIsPlaying}
        speed={speed}
        onSpeedChange={setSpeed}
      />

      {/* Track Schematic SVG */}
      <div style={{ overflowX: "auto", position: "relative" }}>
        <svg viewBox={`0 0 ${WIDTH} 230`} style={{ width: "100%", minWidth: "900px", display: "block" }}>
          <defs>
            <linearGradient id="upTrackGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="dnTrackGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Station Vertical Markers */}
          {stationX.map((st) => (
            <g key={st.station_id} transform={`translate(${st.x}, 0)`}>
              <line x1="0" y1="40" x2="0" y2="200" stroke="var(--border-subtle, #1e293b)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="0" cy="85" r="4" fill="var(--bg-card, #0f172a)" stroke="var(--accent-kpi-blue, #38bdf8)" strokeWidth="2" />
              <circle cx="0" cy="165" r="4" fill="var(--bg-card, #0f172a)" stroke="#34d399" strokeWidth="2" />
              <text x="0" y="30" textAnchor="middle" fill="var(--text-primary, #f8fafc)" fontSize="11" fontWeight="700">
                {st.station_code || st.station_id}
              </text>
              <text x="0" y="42" textAnchor="middle" fill="var(--text-muted, #94a3b8)" fontSize="9">
                {st.chainage_km !== undefined ? `${st.chainage_km} km` : ""}
              </text>
            </g>
          ))}

          {/* UP TRACK (Delhi / Source -> Agra / Destination) */}
          <g className="up-track-group">
            <text x="15" y="89" fill="var(--accent-kpi-blue, #38bdf8)" fontSize="11" fontWeight="800" fontFamily="monospace">
              UP ➔
            </text>
            {/* Rails */}
            <line x1={PAD_X} y1="82" x2={WIDTH - PAD_X} y2="82" stroke="var(--track-rail-color, #334155)" strokeWidth="3" />
            <line x1={PAD_X} y1="88" x2={WIDTH - PAD_X} y2="88" stroke="var(--track-rail-color, #334155)" strokeWidth="3" />
          </g>

          {/* DOWN TRACK (Agra / Destination -> Delhi / Source) */}
          <g className="dn-track-group">
            <text x="15" y="169" fill="#34d399" fontSize="11" fontWeight="800" fontFamily="monospace">
              DN ⬅
            </text>
            {/* Rails */}
            <line x1={PAD_X} y1="162" x2={WIDTH - PAD_X} y2="162" stroke="var(--track-rail-color, #334155)" strokeWidth="3" />
            <line x1={PAD_X} y1="168" x2={WIDTH - PAD_X} y2="168" stroke="var(--track-rail-color, #334155)" strokeWidth="3" />
          </g>

          {/* Section Interlocking Block Dividers and 4-Aspect Signals */}
          {sections.map((sec, idx) => {
            const startX = stationX[idx]?.x || PAD_X;
            const endX = stationX[idx + 1]?.x || (PAD_X + (idx + 1) * 150);
            const midX = (startX + endX) / 2;
            const isSelected = selectedSection === sec.section_id;
            const aspect = signalAspects[sec.section_id] || "GREEN";

            return (
              <g key={sec.section_id}>
                {/* Clickable section area */}
                <rect
                  x={startX}
                  y="55"
                  width={Math.max(10, endX - startX)}
                  height="130"
                  fill={isSelected ? "rgba(56, 189, 248, 0.12)" : "transparent"}
                  stroke={isSelected ? "var(--accent-kpi-blue, #38bdf8)" : "none"}
                  strokeWidth="1.5"
                  strokeDasharray={isSelected ? "4 2" : "none"}
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelectSection?.(sec.section_id)}
                >
                  <title>{sec.section_id}: Click to inspect section</title>
                </rect>

                {/* 4-Aspect Signal Posts for UP and DN */}
                <FourAspectSignal aspect={aspect} label={sec.section_id} x={startX + 18} y={70} />
                <FourAspectSignal aspect={aspect} label="" x={endX - 18} y={150} />

                {/* Section ID label */}
                <text x={midX} y="128" textAnchor="middle" fill="var(--text-muted, #94a3b8)" fontSize="10" fontFamily="monospace">
                  {sec.section_id}
                </text>
              </g>
            );
          })}

          {/* Active Trains Gliding across UP and DN Tracks */}
          {activeTrains.map((train, idx) => {
            const labelText = train.service_name || train.train_name || train.service_number || train.train_id || train.service_id || `Train ${idx + 1}`;
            const labelStr = String(labelText);
            // Dynamic SVG badge width calculation so text never overflows:
            const boxWidth = Math.max(76, labelStr.length * 7.5 + 20);
            const boxHeight = 22;

            return (
              <g
                key={train.train_id || train.service_number || train.service_id || idx}
                transform={`translate(${train.x}, ${train.trackY})`}
                style={{
                  transition: "left 0.4s linear, transform 0.4s linear",
                  willChange: "transform",
                }}
              >
                {/* Dynamic SVG Badge centered at x={-boxWidth/2} */}
                <rect
                  x={-boxWidth / 2}
                  y={-boxHeight / 2}
                  width={boxWidth}
                  height={boxHeight}
                  rx="5"
                  fill="var(--bg-card, #0f172a)"
                  stroke={train.isUp ? "var(--accent-kpi-blue, #38bdf8)" : "#34d399"}
                  strokeWidth="2"
                  filter="drop-shadow(0 2px 5px rgba(0,0,0,0.5))"
                />
                <circle cx={-boxWidth / 2 + 10} cy="0" r="4" fill={train.isUp ? "var(--accent-kpi-blue, #38bdf8)" : "#34d399"} />
                <text
                  x="4"
                  y="4"
                  textAnchor="middle"
                  fill="var(--text-primary, #f8fafc)"
                  fontSize="10"
                  fontWeight="800"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {labelStr}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
