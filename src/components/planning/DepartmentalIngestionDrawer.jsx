import { useState } from "react";
import "./ingestionDrawer.css";

const TMS_RECORDS = [
  { id: "TMS-NDLS-042", section: "NZM-TKD", chainage: "km 14.2–15.8", flawClass: "IMR (Immediate Removal)", flawScore: 99, type: "USFD Transverse Fatigue Rail Flaw", tqi: 48.2, gmt: "54.2 GMT/yr", status: "EMERGENCY (<24h)", priority: "P1 (Critical)", dept: "P-WAY", duration: 120, cautionOrder: "T/409 Caution Order (20 km/h) Imposed", mlPrediction: "Critical Failure in 14 Days -> Urgency Weight: 92%" },
  { id: "TMS-NDLS-078", section: "TKD-FDB", chainage: "km 22.4–24.1", flawClass: "REM (Removal in 3 Days)", flawScore: 86, type: "Joint Sleepers Deep Screening (BCM)", tqi: 38.2, gmt: "48.1 GMT/yr", status: "SCHEDULED (72h)", priority: "P2 (High)", dept: "P-WAY", duration: 180, cautionOrder: "Bundle in nearest 72-hr possession window", mlPrediction: "TQI Exceeds 48.0 Threshold in 26 Days -> Urgency Weight: 76%" },
  { id: "TMS-NDLS-115", section: "FDB-BVH", chainage: "km 31.0–32.5", flawClass: "OBS (Observation)", flawScore: 55, type: "Turnout Points Tamping (Unimat)", tqi: 41.5, gmt: "51.0 GMT/yr", status: "CYCLICAL MONITORING", priority: "P2 (High)", dept: "P-WAY", duration: 90, cautionOrder: "Routine cyclical tamping schedule", mlPrediction: "Point Geometry Deterioration in 18 Days -> Urgency Weight: 86%" },
];

const SMMS_RECORDS = [
  { id: "SMMS-SIG-109", section: "NZM-TKD", asset: "Electric Point Machine 104A", form: "Form S&T T/351 Disconnection Granted by Station Master", test: "Quarterly Overhaul & Stroke Test", cycle: "Overdue by 18 days", priority: "P1 (Critical)", dept: "S&T", duration: 75, interlocking: "Flanking signals strictly interlocked to Danger (Red)", mlPrediction: "Point Detection Friction Trip in 11 Days -> Urgency Weight: 89%" },
  { id: "SMMS-SIG-144", section: "TKD-FDB", asset: "Digital Axle Counter (DAC) Head", form: "Form S&T T/351 Requisition Pending", test: "High-Frequency Calibration", cycle: "Periodic Maintenance", priority: "P2 (High)", dept: "S&T", duration: 60, interlocking: "Track section clear verification locked", mlPrediction: "Resonance Drift in 32 Days -> Urgency Weight: 68%" },
  { id: "SMMS-SIG-182", section: "FDB-BVH", asset: "Automatic Block Signal 12-A", form: "Form S&T T/351 Disconnection Approved", test: "Aspect Lamp & Relay Insulation", cycle: "Overdue by 5 days", priority: "P2 (High)", dept: "S&T", duration: 45, interlocking: "Aspect hold at Danger (Red) until reconnection memo", mlPrediction: "Filament Resistance Spike in 15 Days -> Urgency Weight: 82%" },
];

const TDMS_RECORDS = [
  { id: "TDMS-OHE-088", section: "NZM-TKD", mast: "Mast 14/22 to 15/10", work: "Contact Wire Wear (8.1mm min) & Stagger Adjust", isolation: "ES-NZM-UP-04 De-energized | Ballabgarh TSS Bay 2", ptw: "PTW Issued | Cautionary Notice: Electric Pantograph Lowering Order", priority: "P1 (Critical)", dept: "TRD", duration: 120, mlPrediction: "Wire Wear Exceeds 8.0mm Limit in 16 Days -> Urgency Weight: 91%" },
  { id: "TDMS-OHE-102", section: "TKD-FDB", mast: "Substation Bay 2", work: "Neutral Section PTFE Glide Replacement", isolation: "ES-TKD-DN-02 De-energized | Ballabgarh TSS Bay 1", ptw: "PTW Issued | Cautionary Notice: Electric Pantograph Lowering Order", priority: "P2 (High)", dept: "TRD", duration: 90, mlPrediction: "Arc Erosion Threshold in 24 Days -> Urgency Weight: 79%" },
  { id: "TDMS-OHE-133", section: "FDB-BVH", mast: "Mast 31/04 to 32/18", work: "Bracket Insulator High-Pressure Wash", isolation: "ES-FDB-DN-09 De-energized | Palwal TSS Bay 3", ptw: "PTW Issued | Cautionary Notice: Electric Pantograph Lowering Order", priority: "P3 (Medium)", dept: "TRD", duration: 60, mlPrediction: "Pollution Flashover Risk in 35 Days -> Urgency Weight: 60%" },
];

const COA_RECORDS = [
  { trainNo: "12050", name: "Gatimaan Express (NDLS–AGC)", level: "Level 1 (Super-Precedence)", mult: "10x Penalty", speed: "160 km/h", margin: "Zero Tolerance | Strict Path Protection" },
  { trainNo: "22436", name: "Vande Bharat Express", level: "Level 1 (Super-Precedence)", mult: "10x Penalty", speed: "130 km/h", margin: "Zero Tolerance | Strict Path Protection" },
  { trainNo: "12002", name: "Bhopal Shatabdi Express", level: "Level 1 (Super-Precedence)", mult: "10x Penalty", speed: "130 km/h", margin: "Zero Tolerance | Strict Path Protection" },
  { trainNo: "12622", name: "Tamil Nadu Superfast Express", level: "Level 2 (Mail & Superfast)", mult: "6x Penalty", speed: "110 km/h", margin: "Max Allowable Buffer: 10 mins" },
  { trainNo: "64076", name: "Suburban Commuter EMU (NDLS–PWL)", level: "Level 3 (Suburban EMU)", mult: "8x Penalty (Peak)", speed: "90 km/h", margin: "Peak Commuter Headway Protected" },
  { trainNo: "BOXN_712", name: "Container Rake (CONCOR BCNHL)", level: "Level 5 (Standard Goods)", mult: "1x Penalty", speed: "75 km/h", margin: "Loop Dispatchable / Regulatory Sidetrack" },
];

export default function DepartmentalIngestionDrawer({
  isOpen,
  onClose,
  onBundleAndNormalize,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [isBundling, setIsBundling] = useState(false);
  const [bundleSuccess, setBundleSuccess] = useState(false);

  const handleBundle = () => {
    setIsBundling(true);
    setTimeout(() => {
      setIsBundling(false);
      setBundleSuccess(true);
      onBundleAndNormalize?.();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="ir-drawer-overlay" role="dialog" aria-modal="true" aria-labelledby="ir-ingest-title">
      <div className="ir-drawer-container">
        <header className="ir-drawer-header">
          <div>
            <span className="ir-badge-accent">CRIS UNIFIED INGESTION ARCHITECTURE</span>
            <h2 id="ir-ingest-title">Legacy Departmental Feeds (TMS · SMMS · TDMS · COA)</h2>
            <p>
              Simulates automated ingestion from siloed Indian Railways maintenance and traffic portals.
              Calculates dynamic multi-criteria priority scores and bundles spatial overlaps into joint shadow blocks.
            </p>
          </div>
          <button type="button" className="ir-drawer-close" onClick={onClose} aria-label="Close ingestion drawer">
            ✕
          </button>
        </header>

        {/* Tab Selector */}
        <div className="ir-drawer-tabs" role="tablist">
          <button
            type="button"
            className={`ir-tab-btn ${activeTab === "all" ? "is-active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Feeds Combined (Unified View)
          </button>
          <button
            type="button"
            className={`ir-tab-btn ${activeTab === "tms" ? "is-active" : ""}`}
            onClick={() => setActiveTab("tms")}
          >
            TMS (Track Management)
          </button>
          <button
            type="button"
            className={`ir-tab-btn ${activeTab === "smms" ? "is-active" : ""}`}
            onClick={() => setActiveTab("smms")}
          >
            SMMS (Signalling &amp; Telecom)
          </button>
          <button
            type="button"
            className={`ir-tab-btn ${activeTab === "tdms" ? "is-active" : ""}`}
            onClick={() => setActiveTab("tdms")}
          >
            TDMS (Traction Distribution 25 kV)
          </button>
          <button
            type="button"
            className={`ir-tab-btn ${activeTab === "coa" ? "is-active" : ""}`}
            onClick={() => setActiveTab("coa")}
          >
            COA (Control Office WTT Timetable)
          </button>
        </div>

        {/* Content Area */}
        <div className="ir-drawer-body">
          {(activeTab === "all" || activeTab === "tms") && (
            <div className="ir-feed-section">
              <div className="ir-feed-header">
                <h4>TMS Feed (Civil / P-Way Defects &amp; Track Quality Index)</h4>
                <span className="ir-feed-meta">Feed status: 3 Pending Work Orders</span>
              </div>
              <div className="ir-table-wrap">
                <table className="ir-feed-table">
                  <thead>
                    <tr>
                      <th>Defect ID</th>
                      <th>Section</th>
                      <th>Chainage km</th>
                      <th>USFD Flaw Classification (P-Way)</th>
                      <th>Defect Type &amp; Caution Order</th>
                      <th>TQI Score</th>
                      <th>GMT Load</th>
                      <th>Predictive ML Analytics</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TMS_RECORDS.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.id}</strong></td>
                        <td>{row.section}</td>
                        <td>{row.chainage}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span className={`p-pill ${row.flawScore >= 90 ? "p1" : row.flawScore >= 75 ? "p2" : "p3"}`}>
                              {row.flawClass}
                            </span>
                            <small style={{ fontSize: "10px", color: "#f87171", fontWeight: 700 }}>{row.cautionOrder}</small>
                          </div>
                        </td>
                        <td>{row.type}</td>
                        <td>
                          <span className={`tqi-badge ${row.tqi > 45 ? "status-overdue" : ""}`}>
                            {row.tqi} {row.tqi > 45 ? "⚠ Urgent Tamping" : ""}
                          </span>
                        </td>
                        <td><span className="tqi-badge" style={{ background: "#1e3a5f" }}>{row.gmt}</span></td>
                        <td>
                          <div className="ml-pred-badge">
                            <span className="ml-pred-icon">🤖</span>
                            <strong>{row.mlPrediction}</strong>
                            <span className="ml-solver-tag">→ Input to CP-SAT Optimization Engine</span>
                          </div>
                        </td>
                        <td><span className="p-pill p1">{row.priority}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === "all" || activeTab === "smms") && (
            <div className="ir-feed-section">
              <div className="ir-feed-header">
                <h4>SMMS Feed (Signal &amp; Telecom Interlocking &amp; Detection)</h4>
                <span className="ir-feed-meta">Feed status: 3 Safety Requisitions</span>
              </div>
              <div className="ir-table-wrap">
                <table className="ir-feed-table">
                  <thead>
                    <tr>
                      <th>Work Order ID</th>
                      <th>Section</th>
                      <th>Gear / Asset</th>
                      <th>S&amp;T Form &amp; Interlocking Protocol</th>
                      <th>Maintenance / Testing</th>
                      <th>Predictive ML Analytics</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SMMS_RECORDS.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.id}</strong></td>
                        <td>{row.section}</td>
                        <td>{row.asset}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 700 }}>{row.form}</span>
                            <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 600 }}>🔒 {row.interlocking}</span>
                          </div>
                        </td>
                        <td>{row.test}</td>
                        <td>
                          <div className="ml-pred-badge">
                            <span className="ml-pred-icon">🤖</span>
                            <strong>{row.mlPrediction}</strong>
                            <span className="ml-solver-tag">→ Input to CP-SAT Optimization Engine</span>
                          </div>
                        </td>
                        <td><span className="p-pill p2">{row.priority}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === "all" || activeTab === "tdms") && (
            <div className="ir-feed-section">
              <div className="ir-feed-header">
                <h4>TDMS Feed (Overhead 25 kV AC Catenary &amp; Power Isolation)</h4>
                <span className="ir-feed-meta">Feed status: 3 Traction Permits Required</span>
              </div>
              <div className="ir-table-wrap">
                <table className="ir-feed-table">
                  <thead>
                    <tr>
                      <th>Permit ID</th>
                      <th>Section</th>
                      <th>Traction Sub-Station &amp; Elementary Zone</th>
                      <th>Permit to Work (PTW) Status</th>
                      <th>Traction Work Description</th>
                      <th>Predictive ML Analytics</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TDMS_RECORDS.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.id}</strong></td>
                        <td>{row.section}</td>
                        <td><span className="power-cut-badge">{row.isolation}</span></td>
                        <td>
                          <span style={{ fontSize: "10px", color: "#fbbf24", fontWeight: 700 }}>
                            ⚡ {row.ptw}
                          </span>
                        </td>
                        <td>{row.work}</td>
                        <td>
                          <div className="ml-pred-badge">
                            <span className="ml-pred-icon">🤖</span>
                            <strong>{row.mlPrediction}</strong>
                            <span className="ml-solver-tag">→ Input to CP-SAT Optimization Engine</span>
                          </div>
                        </td>
                        <td><span className="p-pill p2">{row.priority}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === "all" || activeTab === "coa") && (
            <div className="ir-feed-section">
              <div className="ir-feed-header">
                <h4>COA Feed (Control Office Application Working Time Table WTT)</h4>
                <span className="ir-feed-meta">Statutory Train Precedence Multipliers Active</span>
              </div>
              <div className="ir-table-wrap">
                <table className="ir-feed-table">
                  <thead>
                    <tr>
                      <th>Train No.</th>
                      <th>Service Name</th>
                      <th>Statutory Precedence Level</th>
                      <th>CP-SAT Penalty Multiplier</th>
                      <th>Sectional Max Speed</th>
                      <th>Punctuality Dispatch Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COA_RECORDS.map((row) => (
                      <tr key={row.trainNo}>
                        <td><strong>{row.trainNo}</strong></td>
                        <td>{row.name}</td>
                        <td><span className="train-type-pill">{row.level}</span></td>
                        <td>
                          <strong style={{ color: row.mult.includes("10x") ? "#ef4444" : row.mult.includes("8x") ? "#f59e0b" : "#38bdf8" }}>
                            {row.mult}
                          </strong>
                        </td>
                        <td>{row.speed}</td>
                        <td>{row.margin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Action & Scoring Breakdown */}
        <footer className="ir-drawer-footer">
          <div className="ir-priority-formula-box">
            <span className="ir-formula-title">AUTOMATIC MULTI-CRITERIA SCORING WEIGHTS:</span>
            <div className="ir-weights-pills">
              <span>Safety Criticality: <strong>40%</strong></span>
              <span>•</span>
              <span>Defect Urgency: <strong>30%</strong></span>
              <span>•</span>
              <span>Backlog Aging: <strong>20%</strong></span>
              <span>•</span>
              <span>Line Availability Impact: <strong>10%</strong></span>
            </div>
          </div>

          <div className="ir-footer-actions">
            {bundleSuccess && (
              <span className="ir-bundle-success-msg">
                ✓ Normalization Complete: 9 Departmental Requisitions Bundled into 3 Joint Shadow Blocks!
              </span>
            )}
            <button
              type="button"
              className="ir-bundle-action-btn"
              disabled={isBundling}
              onClick={handleBundle}
            >
              {isBundling ? "COMPUTING MULTI-CRITERIA SCORES..." : "⚡ AUTO-NORMALIZE & BUNDLE (JOINT POSSESSIONS)"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
