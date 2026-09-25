import { useMemo, useState } from "react";
import { territoryLabel } from "../../utils/planningLabels.js";
import { useSimulationTime } from "../../context/SimulationTimeContext.jsx";
import TopMasterClock from "../layout/TopMasterClock.jsx";
import "./liveRadar.css";

// Flagship corridors station and chainage definitions
const CORRIDOR_LANDMARKS = {
  delhi_agra: [
    { station_id: "NDLS", station_name: "New Delhi", km: 0.0 },
    { station_id: "NZM", station_name: "Hazrat Nizamuddin", km: 7.2 },
    { station_id: "FDB", station_name: "Faridabad", km: 28.4 },
    { station_id: "PWL", station_name: "Palwal", km: 59.6 },
    { station_id: "MTJ", station_name: "Mathura Jn", km: 141.0 },
    { station_id: "AGC", station_name: "Agra Cantt", km: 195.0 },
  ],
  eastern_hdn: [
    { station_id: "HWH", station_name: "Howrah Jn", km: 0.0 },
    { station_id: "SRP", station_name: "Serampore", km: 20.0 },
    { station_id: "BDC", station_name: "Bandel Jn", km: 40.0 },
    { station_id: "BWN", station_name: "Barddhaman", km: 107.0 },
    { station_id: "PAN", station_name: "Panagarh", km: 164.0 },
    { station_id: "DGR", station_name: "Durgapur", km: 171.0 },
    { station_id: "ASN", station_name: "Asansol Jn", km: 200.0 },
  ],
  western_hdn: [
    { station_id: "MMCT", station_name: "Mumbai Central", km: 0.0 },
    { station_id: "BVI", station_name: "Borivali", km: 30.0 },
    { station_id: "BSR", station_name: "Vasai Road", km: 52.0 },
    { station_id: "PLG", station_name: "Palghar", km: 87.0 },
    { station_id: "VAPI", station_name: "Vapi", km: 168.0 },
    { station_id: "BL", station_name: "Valsad", km: 194.0 },
    { station_id: "ST", station_name: "Surat", km: 263.0 },
  ],
  dfccil_dadri: [
    { station_id: "DADRI_DFC", station_name: "New Dadri DFC", km: 0.0 },
    { station_id: "BORAKI_DFC", station_name: "New Boraki", km: 18.0 },
    { station_id: "KHURJA_DFC", station_name: "New Khurja", km: 68.0 },
    { station_id: "DAUD_KHAN_DFC", station_name: "New Daud Khan", km: 118.0 },
    { station_id: "TUNDLA_DFC", station_name: "New Tundla DFC", km: 180.0 },
  ],
};

// Corridor-specific authentic train formations
// NR Northern HDN: strictly premier passenger services (12050 Gatimaan, 22436 Vande Bharat, 12002 Shatabdi, 12622 Tamil Nadu Express)
// DFCCIL: strictly heavy goods formations (BLC, BOXNHL, BTPN)
const CORRIDOR_TRAINS = {
  delhi_agra: [
    {
      id: "12050",
      label: "🚄 12050 Gatimaan Express (160 km/h)",
      name: "Gatimaan Express (NDLS–AGC)",
      loco: "WAP-7 #30215 (Ghaziabad Shed)",
      speed: 160,
      directionType: "DOWN",
      direction: "DOWN (Agra Bound)",
      line: "DOWN Main",
      baseOffset: 25,
      voltage: "24.8 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.2 kg/cm²",
    },
    {
      id: "12622",
      label: "⚡ 12622 Tamil Nadu Express",
      name: "Tamil Nadu Superfast Express (NDLS–MAS)",
      loco: "WAP-7 #30320 (Royapuram Shed)",
      speed: 110,
      directionType: "DOWN",
      direction: "DOWN (Agra / Chennai Bound)",
      line: "DOWN Main",
      baseOffset: 120,
      voltage: "24.9 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.2 kg/cm²",
    },
    {
      id: "22436",
      label: "⚡ 22436 Vande Bharat Express",
      name: "Vande Bharat Express (BSB–NDLS)",
      loco: "Train 18 / Vande Bharat Trainset",
      speed: 130,
      directionType: "UP",
      direction: "UP (Delhi Bound)",
      line: "UP Main",
      baseOffset: 50,
      voltage: "25.0 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.0 kg/cm²",
    },
    {
      id: "12002",
      label: "🚄 12002 Bhopal Shatabdi Express",
      name: "Bhopal Shatabdi Express (BPL–NDLS)",
      loco: "WAP-7 #30482 (Vadodara Shed)",
      speed: 130,
      directionType: "UP",
      direction: "UP (NDLS Bound)",
      line: "UP Main",
      baseOffset: 155,
      voltage: "24.9 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.1 kg/cm²",
    },
  ],
  dfccil_dadri: [
    {
      id: "DFC_BLC_01",
      label: "🚂 Heavy Double-Stack BLC Container Freight",
      name: "Heavy Double-Stack BLC Container Freight",
      loco: "WAG-12B #60025 (Madhepura Shed)",
      speed: 100,
      directionType: "DOWN",
      direction: "DOWN (Tundla Bound)",
      line: "DOWN Heavy Haul",
      baseOffset: 35,
      voltage: "25.2 kV AC (2x25kV)",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.5 kg/cm²",
    },
    {
      id: "DFC_BOXNHL_02",
      label: "🚂 Long-Haul BOXNHL Coal Formation",
      name: "Long-Haul BOXNHL Coal Formation",
      loco: "WAG-12B #60042 (Madhepura Shed)",
      speed: 90,
      directionType: "DOWN",
      direction: "DOWN (Khurja–Tundla Bound)",
      line: "DOWN Heavy Haul",
      baseOffset: 125,
      voltage: "25.2 kV AC (2x25kV)",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.5 kg/cm²",
    },
    {
      id: "DFC_BTPN_03",
      label: "🚂 BTPN Petroleum Tanker Rake",
      name: "BTPN Petroleum Tanker Rake",
      loco: "WAG-12B #60088 (Madhepura Shed)",
      speed: 85,
      directionType: "UP",
      direction: "UP (Dadri Bound)",
      line: "UP Heavy Haul",
      baseOffset: 110,
      voltage: "25.2 kV AC (2x25kV)",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.6 kg/cm²",
    },
  ],
  eastern_hdn: [
    {
      id: "12301",
      label: "🚄 12301 Howrah Rajdhani",
      name: "Howrah–New Delhi Rajdhani Express",
      loco: "WAP-7 #30201 (Howrah Shed)",
      speed: 130,
      directionType: "DOWN",
      direction: "DOWN (Asansol Bound)",
      line: "DOWN Main",
      baseOffset: 30,
      voltage: "24.8 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.2 kg/cm²",
    },
    {
      id: "22301",
      label: "⚡ 22301 Vande Bharat Express",
      name: "Howrah–NJP Vande Bharat Express",
      loco: "Train 18 / Vande Bharat Trainset",
      speed: 130,
      directionType: "UP",
      direction: "UP (Howrah Bound)",
      line: "UP Main",
      baseOffset: 65,
      voltage: "25.0 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.0 kg/cm²",
    },
    {
      id: "12019",
      label: "🚄 12019 Ranchi Shatabdi",
      name: "Howrah–Ranchi Shatabdi Express",
      loco: "WAP-7 #30245 (Howrah Shed)",
      speed: 120,
      directionType: "UP",
      direction: "UP (Howrah Bound)",
      line: "UP Main",
      baseOffset: 145,
      voltage: "24.9 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.1 kg/cm²",
    },
  ],
  western_hdn: [
    {
      id: "12951",
      label: "🚄 12951 Mumbai Tejas-Rajdhani",
      name: "Mumbai Tejas-Rajdhani Express",
      loco: "WAP-7 #30482 (Vadodara Shed)",
      speed: 130,
      directionType: "DOWN",
      direction: "DOWN (Surat Bound)",
      line: "DOWN Main",
      baseOffset: 40,
      voltage: "24.8 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.2 kg/cm²",
    },
    {
      id: "20901",
      label: "⚡ 20901 Vande Bharat Express",
      name: "Mumbai–Gandhinagar Vande Bharat",
      loco: "Train 18 / Vande Bharat Trainset",
      speed: 130,
      directionType: "UP",
      direction: "UP (MMCT Bound)",
      line: "UP Main",
      baseOffset: 85,
      voltage: "25.0 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.0 kg/cm²",
    },
    {
      id: "12009",
      label: "🚄 12009 Ahmedabad Shatabdi",
      name: "Mumbai–Ahmedabad Shatabdi Express",
      loco: "WAP-7 #30355 (Valsad Shed)",
      speed: 120,
      directionType: "UP",
      direction: "UP (MMCT Bound)",
      line: "UP Main",
      baseOffset: 170,
      voltage: "24.9 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.1 kg/cm²",
    },
  ],
};

const DOWN_SIGNAL_PCTS = [18, 42, 65, 88];
const UP_SIGNAL_PCTS = [12, 38, 62, 85];

function sectionName(territory, sectionId) {
  const section = territory?.sections?.find((item) => item.section_id === sectionId);
  if (!section) return "Selected section";
  const stations = new Map(
    territory.stations?.map((station) => [station.station_id, station.station_name]),
  );
  return `${stations.get(section.from_station) ?? section.from_station} → ${
    stations.get(section.to_station) ?? section.to_station
  }`;
}

export default function PlannerCorridor({
  territory,
  selectedSection,
  onSelectSection,
  activeDisruption,
}) {
  const { simulatedSeconds } = useSimulationTime();
  const [selectedTrain, setSelectedTrain] = useState(null);

  const territoryId = territory?.territory_id || "delhi_agra";
  const landmarkStations = CORRIDOR_LANDMARKS[territoryId] || territory?.stations || [];
  const maxKm = landmarkStations[landmarkStations.length - 1]?.km || 195;

  const trainTemplates = CORRIDOR_TRAINS[territoryId] || CORRIDOR_TRAINS.delhi_agra;

  // 3x speed acceleration factor for smooth human-visible block traversal
  const SPEED_FACTOR = 3;

  // Calculate realtime position and aspect of each train from unified simulatedSeconds
  const activeTrains = useMemo(() => {
    return trainTemplates.map((t) => {
      const speed = activeDisruption?.speed_restriction_kmh ?? t.speed;
      const distanceMoved = (((simulatedSeconds * SPEED_FACTOR) / 3600) * speed + t.baseOffset) % (maxKm + 40);

      let currentKm;
      let progressPct;
      if (t.directionType === "DOWN") {
        currentKm = Math.min(maxKm, distanceMoved);
        progressPct = (currentKm / maxKm) * 88 + 6;
      } else {
        currentKm = Math.max(0, maxKm - distanceMoved);
        progressPct = (currentKm / maxKm) * 88 + 6;
      }

      // Dynamic signal aspect cascade based on active disruptions and section proximity
      let aspect = "GREEN";
      if (activeDisruption && currentKm > 15 && currentKm < 65) {
        aspect = currentKm < 38 ? "RED" : "YELLOW";
      }

      return {
        ...t,
        currentKm: currentKm.toFixed(1),
        progressPct: Math.min(95, Math.max(5, progressPct)),
        aspect,
        speed,
      };
    });
  }, [trainTemplates, simulatedSeconds, maxKm, activeDisruption]);

  const downTrains = activeTrains.filter((t) => t.directionType === "DOWN");
  const upTrains = activeTrains.filter((t) => t.directionType === "UP");

  // Dynamic 4-Aspect Signal Calculations for Down and Up Lines
  const downSignals = useMemo(() => {
    return DOWN_SIGNAL_PCTS.map((pct, idx) => {
      let aspect = "GREEN";

      if (activeDisruption && pct > 30 && pct < 75) {
        aspect = pct < 50 ? "RED" : "YELLOW";
        return { id: `S-${idx + 10}`, pct, aspect };
      }

      // Check distance to any down train ahead of this signal
      for (const tr of downTrains) {
        const delta = tr.progressPct - pct;
        if (delta >= 0 && delta <= 10) {
          aspect = "RED"; // Train in immediate block
          break;
        } else if (delta > 10 && delta <= 22) {
          if (aspect !== "RED") aspect = "YELLOW"; // Train in next block
        } else if (delta > 22 && delta <= 34) {
          if (aspect !== "RED" && aspect !== "YELLOW") aspect = "DOUBLE_YELLOW"; // Train two blocks ahead
        }
      }

      return { id: `S-${idx + 10}`, pct, aspect };
    });
  }, [downTrains, activeDisruption]);

  const upSignals = useMemo(() => {
    return UP_SIGNAL_PCTS.map((pct, idx) => {
      let aspect = "GREEN";

      // Check distance to approaching up trains (moving from right to left)
      for (const tr of upTrains) {
        const delta = pct - tr.progressPct;
        if (delta >= 0 && delta <= 10) {
          aspect = "RED";
          break;
        } else if (delta > 10 && delta <= 22) {
          if (aspect !== "RED") aspect = "YELLOW";
        } else if (delta > 22 && delta <= 34) {
          if (aspect !== "RED" && aspect !== "YELLOW") aspect = "DOUBLE_YELLOW";
        }
      }

      return { id: `N-${idx + 20}`, pct, aspect };
    });
  }, [upTrains]);

  const activeTrainData = selectedTrain
    ? activeTrains.find((t) => t.id === selectedTrain.id) || selectedTrain
    : null;

  return (
    <section className="ir-live-tracker-panel" aria-label="Operations Control Centre Corridor Alignment">
      <header className="ir-tracker-header">
        <div>
          <div className="ir-telemetry-badge" style={{ marginBottom: "6px" }}>
            <span className="ir-radar-ping" />
            <strong style={{ color: "#38bdf8", letterSpacing: "0.05em", fontSize: "11px" }}>
              ● LIVE OCC DISPATCH FEED | 4-ASPECT AUTOMATIC BLOCK INTERLOCKING | ACTIVE RESOLVER
            </strong>
          </div>
          <h2 style={{ fontSize: "18px", margin: "2px 0 4px", color: "#f8fafc" }}>
            {territoryLabel(territory)}
          </h2>
          <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
            Continuous chainage: <strong>{landmarkStations.map((s) => `${s.station_name} (${s.km} km)`).join(" → ")}</strong>
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span className="p-pill p2" style={{ fontSize: "11px" }}>
            Active Section: <strong>{sectionName(territory, selectedSection)}</strong>
          </span>
          {territory?.sections?.length ? (
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {territory.sections.map((sec, idx) => (
                <button
                  key={sec.section_id || `sec-${idx}`}
                  type="button"
                  onClick={() => onSelectSection?.(sec.section_id)}
                  className={`ir-clock-rate-btn ${selectedSection === sec.section_id ? "is-active" : ""}`}
                  style={{ fontSize: "10px", padding: "2px 6px" }}
                  title={`Select ${sec.section_id}`}
                >
                  Sec {idx + 1}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {/* Relocated OCC TIME WARP & DISPATCH CONTROLLER directly above track canvas */}
      <TopMasterClock />

      {/* Corridor Track Canvas */}
      <div className="ir-corridor-track-canvas">
        {/* Stations Top Row with km chainage */}
        <div className="ir-stations-chainage-row">
          {landmarkStations.map((st, idx) => (
            <div
              key={st.station_id || `stn-${idx}`}
              className="ir-station-point"
              style={{ left: `${(idx / Math.max(1, landmarkStations.length - 1)) * 88 + 6}%` }}
            >
              <span className="ir-st-name">{st.station_name}</span>
              <span className="ir-st-km">km {Number(st.km).toFixed(1)}</span>
            </div>
          ))}
        </div>

        {/* TRACK 1: DOWN LINE (SOUTHBOUND) */}
        <div className="ir-track-line-wrapper">
          <span className="ir-track-label">DOWN LINE (SOUTHBOUND) →</span>
          <div className="ir-rail-track down-line">
            <div className="ir-sleepers" />

            {/* 4-Aspect Signals along Down Line */}
            {downSignals.map((sig) => (
              <div
                key={sig.id}
                className="ir-radar-signal"
                style={{ left: `${sig.pct}%` }}
                title={`Signal ${sig.id}: Aspect ${sig.aspect} | Automatic Block Interlocked`}
              >
                <span className={`ir-sig-lamp ${sig.aspect.toLowerCase()}`} />
                <span className="ir-sig-id">{sig.id.replace("-", "")}</span>
              </div>
            ))}

            {/* DOWN Trains Moving with Precise Kilometric Gliding */}
            {downTrains.map((tr) => (
              <div
                key={tr.id}
                className={`ir-radar-train ${selectedTrain?.id === tr.id ? "is-selected" : ""}`}
                style={{
                  left: `${tr.progressPct}%`,
                  transition: "left 0.4s linear, transform 0.15s ease",
                }}
                onClick={() => setSelectedTrain(tr)}
                role="button"
                tabIndex={0}
                aria-label={`Select train ${tr.label}`}
              >
                <span style={{ fontSize: "12px", whiteSpace: "nowrap", fontWeight: 700 }}>
                  {tr.label}
                </span>
                <span style={{ fontSize: "9px", background: "rgba(0,0,0,0.5)", padding: "1px 4px", borderRadius: "3px" }}>
                  km {tr.currentKm}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TRACK 2: UP LINE (NORTHBOUND) */}
        <div className="ir-track-line-wrapper" style={{ marginBottom: "8px" }}>
          <span className="ir-track-label">← UP LINE (NORTHBOUND)</span>
          <div className="ir-rail-track up-line">
            <div className="ir-sleepers" />

            {/* 4-Aspect Signals along Up Line */}
            {upSignals.map((sig) => (
              <div
                key={sig.id}
                className="ir-radar-signal"
                style={{ left: `${sig.pct}%` }}
                title={`Signal ${sig.id}: Aspect ${sig.aspect} | Automatic Block Interlocked`}
              >
                <span className={`ir-sig-lamp ${sig.aspect.toLowerCase()}`} />
                <span className="ir-sig-id">{sig.id.replace("-", "")}</span>
              </div>
            ))}

            {/* UP Trains Moving with Precise Kilometric Gliding */}
            {upTrains.map((tr) => (
              <div
                key={tr.id}
                className={`ir-radar-train ${selectedTrain?.id === tr.id ? "is-selected" : ""}`}
                style={{
                  left: `${tr.progressPct}%`,
                  transition: "left 0.4s linear, transform 0.15s ease",
                }}
                onClick={() => setSelectedTrain(tr)}
                role="button"
                tabIndex={0}
                aria-label={`Select train ${tr.label}`}
              >
                <span style={{ fontSize: "12px", whiteSpace: "nowrap", fontWeight: 700 }}>
                  {tr.label}
                </span>
                <span style={{ fontSize: "9px", background: "rgba(0,0,0,0.5)", padding: "1px 4px", borderRadius: "3px" }}>
                  km {tr.currentKm}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Locomotive Pilot HUD Modal / Drawer */}
      {activeTrainData ? (
        <aside className="ir-loco-hud-card" style={{ marginTop: "14px" }} aria-label="Locomotive Pilot Real-Time Telemetry HUD">
          <div className="ir-hud-header">
            <div>
              <span className="ir-hud-badge">LIVE LOCOMOTIVE PILOT HUD</span>
              <h4>{activeTrainData.name} ({activeTrainData.id})</h4>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8" }}>
                Active Rake: <strong>{activeTrainData.loco}</strong> · Corridor Position: <strong>km {activeTrainData.currentKm} / {maxKm} km</strong>
              </p>
            </div>
            <button
              type="button"
              className="ir-hud-close"
              onClick={() => setSelectedTrain(null)}
              aria-label="Close Locomotive Pilot HUD"
            >
              ×
            </button>
          </div>

          <div className="ir-hud-metrics-grid">
            <div className="ir-hud-gauge">
              <span className="ir-gauge-label">SPEEDOMETER</span>
              <strong className="ir-gauge-val" style={{ color: "#38bdf8" }}>
                {activeTrainData.speed} <small>km/h</small>
              </strong>
              <span className="ir-gauge-sub">MPS: {activeTrainData.speed} km/h</span>
            </div>

            <div className="ir-hud-gauge">
              <span className="ir-gauge-label">BRAKE PIPE (BP)</span>
              <strong className="ir-gauge-val" style={{ color: "#4ade80" }}>
                {activeTrainData.bpPressure}
              </strong>
              <span className="ir-gauge-sub">Normal (4.8–5.0)</span>
            </div>

            <div className="ir-hud-gauge">
              <span className="ir-gauge-label">MAIN RESERVOIR (MR)</span>
              <strong className="ir-gauge-val" style={{ color: "#4ade80" }}>
                {activeTrainData.mrPressure}
              </strong>
              <span className="ir-gauge-sub">Charged (8.5–10.0)</span>
            </div>

            <div className="ir-hud-gauge">
              <span className="ir-gauge-label">OHE 25 kV AC</span>
              <strong className="ir-gauge-val" style={{ color: "#fbbf24" }}>
                {activeTrainData.voltage}
              </strong>
              <span className="ir-gauge-sub">Catenary Energized</span>
            </div>

            <div className="ir-hud-gauge">
              <span className="ir-gauge-label">NEXT SIGNAL ASPECT</span>
              <div className="ir-hud-aspect-box">
                <span className={`ir-aspect-circle ${activeTrainData.aspect.toLowerCase()}`} />
                <strong>{activeTrainData.aspect}</strong>
              </div>
              <span className="ir-gauge-sub">Automatic Block Ahead</span>
            </div>
          </div>
        </aside>
      ) : null}
    </section>
  );
}
