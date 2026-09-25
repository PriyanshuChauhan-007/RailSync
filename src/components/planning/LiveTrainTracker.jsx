import { useEffect, useState, useMemo } from "react";
import "./liveRadar.css";

export default function LiveTrainTracker({
  territory,
  trains = [],
  blocks = [],
  activeDisruption,
}) {
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [radarTime, setRadarTime] = useState(0);

  // Smooth 3x gliding loop with high fidelity
  useEffect(() => {
    const interval = setInterval(() => {
      setRadarTime((t) => (t + 3) % 3600);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const stations = territory?.stations || [
    { station_id: "NDLS", station_name: "New Delhi", km: 0 },
    { station_id: "NZM", station_name: "Hazrat Nizamuddin", km: 7.2 },
    { station_id: "TKD", station_name: "Tughlakabad", km: 14.5 },
    { station_id: "FDB", station_name: "Faridabad", km: 28.3 },
    { station_id: "BVH", station_name: "Ballabgarh", km: 38.6 },
    { station_id: "PWL", station_name: "Palwal", km: 60.1 },
  ];

  // Authentic Northern HDN Passenger Services
  const downTrains = useMemo(() => [
    {
      id: "12050",
      name: "Gatimaan Express (NDLS–AGC)",
      loco: "WAP-7 #30215 (Ghaziabad Shed)",
      speed: activeDisruption?.speed_restriction_kmh ?? 160,
      voltage: "24.8 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.2 kg/cm²",
      direction: "DOWN (Agra Bound)",
      line: "DOWN Main",
      progress: ((radarTime * 1.8) % 1000) / 10,
      aspect: activeDisruption ? "YELLOW" : "GREEN",
    },
    {
      id: "12622",
      name: "Tamil Nadu Superfast Express (NDLS–MAS)",
      loco: "WAP-7 #30320 (Royapuram Shed)",
      speed: 110,
      voltage: "24.9 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.2 kg/cm²",
      direction: "DOWN (Agra / Chennai Bound)",
      line: "DOWN Main",
      progress: (((radarTime * 1.2) + 400) % 1000) / 10,
      aspect: "GREEN",
    },
  ], [radarTime, activeDisruption]);

  const upTrains = useMemo(() => [
    {
      id: "22436",
      name: "Vande Bharat Express (BSB–NDLS)",
      loco: "Train 18 / Vande Bharat Rake",
      speed: 130,
      voltage: "25.0 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.0 kg/cm²",
      direction: "UP (Delhi Bound)",
      line: "UP Main",
      progress: (100 - (((radarTime * 1.5) + 200) % 1000) / 10),
      aspect: "GREEN",
    },
    {
      id: "12002",
      name: "Bhopal Shatabdi Express (BPL–NDLS)",
      loco: "WAP-7 #30482 (Vadodara Shed)",
      speed: 130,
      voltage: "24.9 kV AC",
      bpPressure: "5.0 kg/cm²",
      mrPressure: "9.1 kg/cm²",
      direction: "UP (NDLS Bound)",
      line: "UP Main",
      progress: (100 - (((radarTime * 1.4) + 650) % 1000) / 10),
      aspect: "GREEN",
    },
  ], [radarTime]);

  const activeTrainData = selectedTrain
    ? [...downTrains, ...upTrains].find((t) => t.id === selectedTrain.id) || selectedTrain
    : null;

  return (
    <div className="ir-live-tracker-panel" aria-label="Live Train Tracker & 4-Aspect Interlocking Radar">
      <header className="ir-tracker-header">
        <div>
          <span className="ir-badge-accent">OCC LIVE TRAFFIC RADAR</span>
          <h3>Live Corridor Train Tracking &amp; 4-Aspect Interlocking</h3>
          <p>
            Dynamically tracks train headway and automatic signal aspect cascades.
            Click any train to open the real-time Locomotive Pilot HUD.
          </p>
        </div>
        <div className="ir-radar-telemetry">
          <span className="ir-radar-ping" />
          <span>RADAR SWEEP ACTIVE</span>
        </div>
      </header>

      {/* Corridor Diagram with UP & DOWN Tracks */}
      <div className="ir-corridor-track-canvas">
        {/* Stations Top Bar */}
        <div className="ir-stations-chainage-row">
          {stations.map((st, idx) => (
            <div
              key={st.station_id || `st-${idx}`}
              className="ir-station-point"
              style={{ left: `${(idx / Math.max(1, stations.length - 1)) * 92 + 4}%` }}
            >
              <span className="ir-st-name">{st.station_name || st.station_id}</span>
              <span className="ir-st-km">km {st.km ?? (idx * 12.5).toFixed(1)}</span>
            </div>
          ))}
        </div>

        {/* TRACK 1: DOWN LINE */}
        <div className="ir-track-line-wrapper">
          <span className="ir-track-label">DOWN LINE (SOUTHBOUND) →</span>
          <div className="ir-rail-track down-line">
            <div className="ir-sleepers" />

            {/* 4-Aspect Signal Positions along Down Track */}
            {[18, 42, 65, 88].map((pct, idx) => {
              const isDisrupted = activeDisruption && pct > 35 && pct < 75;
              const aspect = isDisrupted ? (pct < 50 ? "RED" : "YELLOW") : "GREEN";
              return (
                <div
                  key={`down-sig-${idx}`}
                  className="ir-radar-signal"
                  style={{ left: `${pct}%` }}
                  title={`Signal S-${idx + 10}: Aspect ${aspect}`}
                >
                  <span className={`ir-sig-lamp ${aspect.toLowerCase()}`} />
                  <span className="ir-sig-id">S{idx + 10}</span>
                </div>
              );
            })}

            {/* DOWN Trains Moving */}
            {downTrains.map((tr) => (
              <div
                key={tr.id}
                className={`ir-radar-train ${selectedTrain?.id === tr.id ? "is-selected" : ""}`}
                style={{
                  left: `${tr.progress}%`,
                  transition: "left 0.4s linear, transform 0.15s ease",
                }}
                onClick={() => setSelectedTrain(tr)}
                role="button"
                tabIndex={0}
                aria-label={`Select train ${tr.id}`}
              >
                <div className="ir-train-icon">🚆</div>
                <div className="ir-train-tag">
                  <strong>{tr.id}</strong>
                  <span>{tr.speed} km/h</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TRACK 2: UP LINE */}
        <div className="ir-track-line-wrapper">
          <span className="ir-track-label">← UP LINE (NORTHBOUND)</span>
          <div className="ir-rail-track up-line">
            <div className="ir-sleepers" />

            {/* 4-Aspect Signal Positions along Up Track */}
            {[12, 38, 62, 85].map((pct, idx) => {
              return (
                <div
                  key={`up-sig-${idx}`}
                  className="ir-radar-signal"
                  style={{ left: `${pct}%` }}
                  title={`Signal N-${idx + 20}: Aspect GREEN`}
                >
                  <span className="ir-sig-lamp green" />
                  <span className="ir-sig-id">N{idx + 20}</span>
                </div>
              );
            })}

            {/* UP Trains Moving */}
            {upTrains.map((tr) => (
              <div
                key={tr.id}
                className={`ir-radar-train ${selectedTrain?.id === tr.id ? "is-selected" : ""}`}
                style={{
                  left: `${tr.progress}%`,
                  transition: "left 0.4s linear, transform 0.15s ease",
                }}
                onClick={() => setSelectedTrain(tr)}
                role="button"
                tabIndex={0}
                aria-label={`Select train ${tr.id}`}
              >
                <div className="ir-train-icon">🚅</div>
                <div className="ir-train-tag">
                  <strong>{tr.id}</strong>
                  <span>{tr.speed} km/h</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LOCOMOTIVE PILOT HUD CONSOLE DRAWER */}
      {activeTrainData && (
        <div className="ir-loco-hud-drawer" role="region" aria-label="Locomotive Pilot HUD">
          <header className="ir-hud-header">
            <div className="ir-hud-title">
              <span className="ir-hud-tag">LOCOMOTIVE PILOT CAB HUD · CAB SIGNALLING</span>
              <h4>{activeTrainData.id} · {activeTrainData.name}</h4>
              <p>{activeTrainData.loco} · Route: {activeTrainData.line}</p>
            </div>
            <button
              type="button"
              className="ir-hud-close"
              onClick={() => setSelectedTrain(null)}
              aria-label="Close HUD"
            >
              ✕
            </button>
          </header>

          <div className="ir-hud-gauges-grid">
            <div className="ir-gauge-card">
              <span className="ir-gauge-label">SPEEDOMETER</span>
              <div className="ir-gauge-val-big text-sky">{activeTrainData.speed} <small>km/h</small></div>
              <span className="ir-gauge-sub">MPS Limit: {activeTrainData.speed} km/h</span>
            </div>

            <div className="ir-gauge-card">
              <span className="ir-gauge-label">25 kV AC CATENARY</span>
              <div className="ir-gauge-val-big text-emerald">{activeTrainData.voltage}</div>
              <span className="ir-gauge-sub">Overhead Catenary Live</span>
            </div>

            <div className="ir-gauge-card">
              <span className="ir-gauge-label">BRAKE PIPE (BP)</span>
              <div className="ir-gauge-val-big text-emerald">{activeTrainData.bpPressure}</div>
              <span className="ir-gauge-sub">Normal Release State</span>
            </div>

            <div className="ir-gauge-card">
              <span className="ir-gauge-label">MAIN RESERVOIR (MR)</span>
              <div className="ir-gauge-val-big text-sky">{activeTrainData.mrPressure}</div>
              <span className="ir-gauge-sub">Dual Compressor Online</span>
            </div>

            <div className="ir-gauge-card is-aspect-hud">
              <span className="ir-gauge-label">IN-CAB SIGNAL ASPECT</span>
              <div className="ir-cab-aspect-pill">
                <span className={`ir-aspect-circle ${activeTrainData.aspect.toLowerCase()}`} />
                <strong>{activeTrainData.aspect}</strong>
              </div>
              <span className="ir-gauge-sub">Automatic Train Protection (Kavach)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
