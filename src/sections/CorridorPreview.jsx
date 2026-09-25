import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import SectionHeading from "../components/ui/SectionHeading.jsx";
import { demoCorridors } from "../components/schematic/demoCorridors.js";

function SingleCorridorTrack({ corridor, activeSection, onSelectSection }) {
  const reduceMotion = useReducedMotion();
  const [hoveredStation, setHoveredStation] = useState(null);
  const [hoveredSection, setHoveredSection] = useState(null);

  const stations = corridor?.stations || [];
  const sections = corridor?.sections || [];
  const trains = corridor?.activeTrains || [];

  const count = stations.length;
  const pad = 60;
  const width = 1100;
  const y = 82;
  const inner = width - pad * 2;
  const xAt = (index) => pad + (inner * index) / Math.max(1, count - 1);
  const ease = [0.22, 1, 0.36, 1];
  const sleepers = Array.from({ length: 32 }, (_, index) => pad + (inner * index) / 31);

  return (
    <div className="corridor-single-panel" style={{ marginBottom: "28px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "var(--accent-blue)",
              textTransform: "uppercase",
            }}
          >
            {corridor.badge || "TRUNK CORRIDOR"} · {stations.length} STATIONS · {sections.length} SECTIONS
          </span>
          <h3 style={{ margin: "2px 0 0", fontSize: "18px", color: "var(--text-primary)" }}>
            {corridor.name}
          </h3>
        </div>

        {/* Premier Active Trains on Corridor */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {trains.map((tr) => (
            <span
              key={tr.id}
              className="p-pill"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
            >
              {tr.label}
            </span>
          ))}
        </div>
      </div>

      <div
        className="corridor-track"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "16px 14px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          overflowX: "auto",
        }}
      >
        <svg
          className="corridor-svg"
          viewBox={`0 0 ${width} 165`}
          style={{ width: "100%", minWidth: "980px", display: "block" }}
          role="img"
          aria-label={`Rail corridor schematic for ${corridor.name}`}
        >
          {/* Sleepers */}
          {sleepers.map((x) => (
            <line
              key={x}
              x1={x}
              y1={y - 12}
              x2={x}
              y2={y + 16}
              stroke="var(--chart-grid)"
              strokeWidth="2.5"
            />
          ))}

          {/* DOWN Main Track */}
          <motion.line
            x1={pad}
            y1={y - 6}
            x2={width - pad}
            y2={y - 6}
            stroke="var(--text-secondary)"
            strokeWidth="3"
            initial={{ pathLength: reduceMotion ? 1 : 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, ease }}
          />

          {/* UP Main Track */}
          <motion.line
            x1={pad}
            y1={y + 8}
            x2={width - pad}
            y2={y + 8}
            stroke="var(--accent)"
            strokeWidth="3"
            initial={{ pathLength: reduceMotion ? 1 : 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: 0.1, ease }}
          />

          {/* Track Sections Hitboxes & Labels */}
          {sections.map((section, index) => {
            const x1 = xAt(Math.min(index, count - 2));
            const x2 = xAt(Math.min(index + 1, count - 1));
            const mid = (x1 + x2) / 2;
            const secId = section.section_id;
            const isHighlighted = hoveredSection === secId || activeSection === secId;

            return (
              <g
                key={secId}
                className="section-hit"
                onMouseEnter={() => setHoveredSection(secId)}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => onSelectSection?.(secId)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={x1 + 6}
                  y={y - 36}
                  width={Math.max(20, x2 - x1 - 12)}
                  height="72"
                  fill={isHighlighted ? "rgba(2, 132, 199, 0.12)" : "transparent"}
                  rx="4"
                />
                <text
                  x={mid}
                  y={y - 20}
                  textAnchor="middle"
                  fill={isHighlighted ? "var(--accent-blue)" : "var(--text-muted)"}
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {secId}
                </text>
              </g>
            );
          })}

          {/* Station Nodes and Vertical Stems */}
          {stations.map((station, index) => {
            const xPos = xAt(index);
            const isHovered = hoveredStation === station.station_id;
            const isTerminus = index === 0 || index === count - 1;

            return (
              <g
                key={station.station_id}
                transform={`translate(${xPos} 0)`}
                onMouseEnter={() => setHoveredStation(station.station_id)}
                onMouseLeave={() => setHoveredStation(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Station Stem Line */}
                <line
                  x1="0"
                  y1={y - 4}
                  x2="0"
                  y2={index % 2 === 0 ? y - 42 : y + 42}
                  stroke="var(--border-color)"
                  strokeWidth="1.5"
                  strokeDasharray="2 3"
                />

                {/* Station Ring Indicator */}
                <circle
                  cx="0"
                  cy={y + 1}
                  r={isTerminus ? 7 : 5}
                  fill={isHovered ? "var(--accent-blue)" : "var(--bg-surface)"}
                  stroke={isHovered ? "var(--accent-blue)" : "var(--text-primary)"}
                  strokeWidth="2.5"
                />
                {isTerminus ? (
                  <circle cx="0" cy={y + 1} r="2.5" fill="var(--text-primary)" />
                ) : null}

                {/* Station Name Above / Below */}
                <text
                  x="0"
                  y={index % 2 === 0 ? y - 48 : y + 54}
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize="12"
                  fontWeight="700"
                >
                  {station.station_name}
                </text>

                {/* Station KM Chainage */}
                <text
                  x="0"
                  y={index % 2 === 0 ? y - 60 : y + 66}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  km {Number(station.km || index * 25).toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Active Moving Trains Gliding Along Corridor */}
          {trains.map((train, idx) => {
            const isDown = train.direction === 1;
            const trainY = isDown ? y - 6 : y + 8;
            const basePct = isDown ? 25 + idx * 30 : 75 - idx * 28;
            const trainX = pad + (inner * (basePct % 90)) / 100;
            const trainLabel = `${train.id} ${isDown ? "→" : "←"}`;
            const boxWidth = Math.max(76, trainLabel.length * 7.5 + 20);
            const boxX = -boxWidth / 2;

            return (
              <g key={train.id} transform={`translate(${trainX} ${trainY})`}>
                <rect
                  x={boxX}
                  y="-12"
                  width={boxWidth}
                  height="22"
                  rx="4"
                  fill={isDown ? "var(--card-bg)" : "var(--bg-surface)"}
                  stroke="var(--accent-blue)"
                  strokeWidth="1.5"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
                />
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize="10"
                  fontWeight="800"
                >
                  {trainLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Bottom Station Quick Links */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            paddingTop: "10px",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: "12px",
            color: "var(--text-secondary)",
          }}
        >
          {stations.map((st) => (
            <span
              key={st.station_id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 6px",
                borderRadius: "4px",
                background: hoveredStation === st.station_id ? "var(--surface-subtle)" : "transparent",
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>{st.station_name}</strong>
              <small style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>({st.station_id})</small>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CorridorPreview() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedSection, setSelectedSection] = useState(null);

  const displayed = selectedTab === "all"
    ? demoCorridors
    : demoCorridors.filter((c) => c.territory_id === selectedTab);

  return (
    <section className="section corridor" id="corridor">
      <div className="section-inner">
        <SectionHeading
          eyebrow="Corridor Infrastructure"
          title="Interactive Public Route Schematics"
        >
          Continuous chainage, dynamic track circuits, and active train services across all 4 operational corridors.
        </SectionHeading>

        {/* Corridor Tab Filter */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "20px",
          }}
          role="tablist"
          aria-label="Filter corridor overview"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedTab === "all"}
            onClick={() => setSelectedTab("all")}
            className="rs-btn-secondary"
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontWeight: 700,
              fontSize: "12px",
              background: selectedTab === "all" ? "var(--accent)" : "var(--bg-surface)",
              color: selectedTab === "all" ? "var(--on-accent)" : "var(--text-primary)",
              borderColor: selectedTab === "all" ? "var(--accent)" : "var(--border-color)",
              cursor: "pointer",
            }}
          >
            All Corridors (4)
          </button>

          {demoCorridors.map((c) => (
            <button
              key={c.territory_id}
              type="button"
              role="tab"
              aria-selected={selectedTab === c.territory_id}
              onClick={() => setSelectedTab(c.territory_id)}
              className="rs-btn-secondary"
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                fontWeight: 700,
                fontSize: "12px",
                background: selectedTab === c.territory_id ? "var(--accent)" : "var(--bg-surface)",
                color: selectedTab === c.territory_id ? "var(--on-accent)" : "var(--text-primary)",
                borderColor: selectedTab === c.territory_id ? "var(--accent)" : "var(--border-color)",
                cursor: "pointer",
              }}
            >
              {c.shortName || c.name}
            </button>
          ))}
        </div>

        {/* Stacked or Isolated Corridors */}
        <div className="corridors-container">
          {displayed.map((corridor) => (
            <SingleCorridorTrack
              key={corridor.territory_id}
              corridor={corridor}
              activeSection={selectedSection}
              onSelectSection={setSelectedSection}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
