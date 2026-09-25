import { useState } from "react";
import "./ingestionDrawer.css";

const TMS_RECORDS = [
  { id: "TMS-NDLS-042", section: "NZM-TKD", chainage: "km 14.2–15.8", type: "USFD IMR Rail Flaw", tqi: 44.8, status: "OVERDUE (14d)", priority: "P1 (Critical)", dept: "P-WAY", duration: 120 },
  { id: "TMS-NDLS-078", section: "TKD-FDB", chainage: "km 22.4–24.1", type: "Joint Sleepers Deep Screening (BCM)", tqi: 38.2, status: "SCHEDULED", priority: "P2 (High)", dept: "P-WAY", duration: 180 },
  { id: "TMS-NDLS-115", section: "FDB-BVH", chainage: "km 31.0–32.5", type: "Turnout Points Tamping (Unimat)", tqi: 41.5, status: "OVERDUE (6d)", priority: "P2 (High)", dept: "P-WAY", duration: 90 },
];

const SMMS_RECORDS = [
  { id: "SMMS-SIG-109", section: "NZM-TKD", asset: "Electric Point Machine 104A", test: "Quarterly Overhaul & Stroke Test", cycle: "Overdue by 18 days", priority: "P1 (Critical)", dept: "S&T", duration: 75 },
  { id: "SMMS-SIG-144", section: "TKD-FDB", asset: "Digital Axle Counter (DAC) Head", test: "High-Frequency Calibration", cycle: "Periodic Maintenance", priority: "P2 (High)", dept: "S&T", duration: 60 },
  { id: "SMMS-SIG-182", section: "FDB-BVH", asset: "Automatic Block Signal 12-A", test: "Aspect Lamp & Relay Insulation", cycle: "Overdue by 5 days", priority: "P2 (High)", dept: "S&T", duration: 45 },
];

const TDMS_RECORDS = [
  { id: "TDMS-OHE-088", section: "NZM-TKD", mast: "Mast 14/22 to 15/10", work: "Contact Wire Wear (8.1mm min) & Stagger Adjust", isolation: "25 kV Elementary Section ES-04", priority: "P1 (Critical)", dept: "TRD", duration: 120 },
  { id: "TDMS-OHE-102", section: "TKD-FDB", mast: "Substation Bay 2", work: "Neutral Section PTFE Glide Replacement", isolation: "Ballabgarh TSS Section 2", priority: "P2 (High)", dept: "TRD", duration: 90 },
  { id: "TDMS-OHE-133", section: "FDB-BVH", mast: "Mast 31/04 to 32/18", work: "Bracket Insulator High-Pressure Wash", isolation: "25 kV Elementary Section ES-09", priority: "P3 (Medium)", dept: "TRD", duration: 60 },
];

const COA_RECORDS = [
  { trainNo: "12002", name: "Bhopal Shatabdi Express", type: "PREMIER PASSENGER", speed: "130 km/h", margin: "Zero Tolerance" },
  { trainNo: "12952", name: "Mumbai Central Rajdhani", type: "SUPERFAST RAJDHANI", speed: "130 km/h", margin: "Zero Tolerance" },
  { trainNo: "22436", name: "Vande Bharat Express", type: "VANDE BHARAT", speed: "130 km/h", margin: "5 min headway" },
  { trainNo: "BOXN_712", name: "Container Rake (CONCOR BCNHL)", type: "HEAVY FREIGHT", speed: "75 km/h", margin: "Loop Dispatchable" },
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
                      <th>Defect / Task Type</th>
                      <th>TQI Score</th>
                      <th>Maintenance Status</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TMS_RECORDS.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.id}</strong></td>
                        <td>{row.section}</td>
                        <td>{row.chainage}</td>
                        <td>{row.type}</td>
                        <td><span className="tqi-badge">{row.tqi}</span></td>
                        <td><span className={row.status.includes("OVERDUE") ? "status-overdue" : "status-ok"}>{row.status}</span></td>
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
                      <th>Maintenance / Testing</th>
                      <th>Inspection Cycle</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SMMS_RECORDS.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.id}</strong></td>
                        <td>{row.section}</td>
                        <td>{row.asset}</td>
                        <td>{row.test}</td>
                        <td><span className={row.cycle.includes("Overdue") ? "status-overdue" : "status-ok"}>{row.cycle}</span></td>
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
                      <th>OHE Mast Range</th>
                      <th>Traction Work Description</th>
                      <th>Power Isolation Requirement</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TDMS_RECORDS.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.id}</strong></td>
                        <td>{row.section}</td>
                        <td>{row.mast}</td>
                        <td>{row.work}</td>
                        <td><span className="power-cut-badge">{row.isolation}</span></td>
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
                <span className="ir-feed-meta">Feed status: Synchronized Active Paths</span>
              </div>
              <div className="ir-table-wrap">
                <table className="ir-feed-table">
                  <thead>
                    <tr>
                      <th>Train No.</th>
                      <th>Service Name</th>
                      <th>Service Classification</th>
                      <th>Sectional Max Speed</th>
                      <th>Punctuality Dispatch Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COA_RECORDS.map((row) => (
                      <tr key={row.trainNo}>
                        <td><strong>{row.trainNo}</strong></td>
                        <td>{row.name}</td>
                        <td><span className="train-type-pill">{row.type}</span></td>
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
