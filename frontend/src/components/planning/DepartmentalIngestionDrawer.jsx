import { useState } from "react";

const PREDICTIVE_RECORDS = [
  {
    recordId: "TMS-042",
    dept: "P-WAY",
    deptFull: "Track Management System (TMS)",
    system: "TMS",
    asset: "KM 24.8 UP Main Line Track Weld",
    category: "Ultrasonic Rail Flaw",
    gmt: "54.2 GMT/yr",
    rawObserved: "0.8mm internal micro-fissure detected during USFD run #18",
    prediction: "ML Prediction: Critical Failure in 14 Days -> Urgency Weight: 92%",
    urgencyWeight: 92,
    daysToFailure: 14,
    status: "CRITICAL P1",
    action: "Deep rail weld replacement & hydraulic joint clamping",
  },
  {
    recordId: "SMMS-109",
    dept: "S&T",
    deptFull: "Signalling Maintenance Management (SMMS)",
    system: "SMMS",
    asset: "Point Machine 14B (Crossover 12)",
    category: "Current Signature Anomaly",
    gmt: "48.6 GMT/yr",
    rawObserved: "Switch throw operating peak current rose from 3.2A to 4.7A",
    prediction: "ML Prediction: Point Detection Friction Trip in 11 Days -> Urgency Weight: 89%",
    urgencyWeight: 89,
    daysToFailure: 11,
    status: "URGENT P1",
    action: "Point slide chair lubrication & motor stroke calibration",
  },
  {
    recordId: "TDMS-088",
    dept: "TRD",
    deptFull: "Traction Distribution Management (TDMS)",
    system: "TDMS",
    asset: "Traction Catenary Span SEC02/14",
    category: "Contact Wire Thickness Loss",
    gmt: "51.0 GMT/yr",
    rawObserved: "Laser contact wire sensor measured residual diameter 8.2mm",
    prediction: "ML Prediction: Contact Wire Wear Exceeds 8.0mm in 16 Days -> Urgency Weight: 91%",
    urgencyWeight: 91,
    daysToFailure: 16,
    status: "CRITICAL P1",
    action: "Splice wire restoration & dropper tension re-balancing",
  },
];

export default function DepartmentalIngestionDrawer({ isOpen = true, onClose, onSelectTask }) {
  const [filterDept, setFilterDept] = useState("ALL");
  const [collapsed, setCollapsed] = useState(!isOpen);

  const displayedRecords = filterDept === "ALL"
    ? PREDICTIVE_RECORDS
    : PREDICTIVE_RECORDS.filter((r) => r.system === filterDept);

  return (
    <div
      className="departmental-ingestion-drawer"
      style={{
        backgroundColor: "var(--bg-card, #0f172a)",
        border: "1px solid var(--border-color, #334155)",
        borderRadius: "8px",
        marginBottom: "20px",
        overflow: "hidden",
        boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          backgroundColor: "var(--bg-card-subtle, #1e293b)",
          borderBottom: "1px solid var(--border-color, #334155)",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "var(--accent-kpi-blue, #38bdf8)",
              boxShadow: "0 0 8px var(--accent-kpi-blue, #38bdf8)",
            }}
          />
          <h3
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              color: "var(--text-primary, #f8fafc)",
              textTransform: "uppercase",
            }}
          >
            DEPARTMENTAL INGESTION LAYER (TMS / SMMS / TDMS)
          </h3>
          <span
            style={{
              fontSize: "11px",
              backgroundColor: "rgba(56, 189, 248, 0.12)",
              color: "var(--accent-kpi-blue, #38bdf8)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              padding: "2px 8px",
              borderRadius: "12px",
              fontWeight: 700,
            }}
          >
            PREDICTIVE DEGRADATION ACTIVE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "inline-flex", borderRadius: "5px", overflow: "hidden", border: "1px solid var(--border-color, #334155)" }}>
            {["ALL", "TMS", "SMMS", "TDMS"].map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setFilterDept(dept)}
                style={{
                  height: "28px",
                  padding: "0 10px",
                  border: "none",
                  backgroundColor: filterDept === dept ? "var(--accent-kpi-blue, #38bdf8)" : "var(--bg-card, #0f172a)",
                  color: filterDept === dept ? "#080c14" : "var(--text-secondary, #cbd5e1)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {dept}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            style={{
              height: "28px",
              padding: "0 10px",
              borderRadius: "5px",
              backgroundColor: "var(--bg-card, #0f172a)",
              border: "1px solid var(--border-color, #334155)",
              color: "var(--text-secondary, #cbd5e1)",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {collapsed ? "Expand Drawer ▼" : "Collapse ▲"}
          </button>
        </div>
      </div>

      {/* Solver Objective Binding Announcement */}
      <div
        style={{
          padding: "8px 18px",
          backgroundColor: "rgba(56, 189, 248, 0.08)",
          borderBottom: "1px solid var(--border-subtle, #1e293b)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "11px",
          color: "var(--accent-kpi-blue, #38bdf8)",
          fontWeight: 700,
          letterSpacing: "0.02em",
        }}
      >
        <span aria-hidden="true">⚡</span>
        CP-SAT SOLVER OBJECTIVE BINDING: ML Urgency Weights directly scale penalty terms in the Google OR-Tools CP-SAT objective function to prioritize high-risk degradation blocks before critical asset failure.
      </div>

      {/* Table Content */}
      {!collapsed && (
        <div style={{ overflowX: "auto", padding: "12px 18px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              color: "var(--text-primary, #f8fafc)",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-color, #334155)", color: "var(--text-muted, #94a3b8)" }}>
                <th style={{ padding: "8px 10px" }}>Ref ID / Dept</th>
                <th style={{ padding: "8px 10px" }}>Asset &amp; Category</th>
                <th style={{ padding: "8px 10px" }}>Observed Telemetry</th>
                <th style={{ padding: "8px 10px", color: "var(--accent-kpi-blue, #38bdf8)", fontWeight: 800 }}>
                  Predictive ML Analytics
                </th>
                <th style={{ padding: "8px 10px" }}>CP-SAT Weight</th>
                <th style={{ padding: "8px 10px" }}>Intervention</th>
              </tr>
            </thead>
            <tbody>
              {displayedRecords.map((rec) => (
                <tr
                  key={rec.recordId}
                  style={{
                    borderBottom: "1px solid var(--border-subtle, #1e293b)",
                    backgroundColor: "transparent",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-subtle, #1e293b)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td style={{ padding: "10px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 800, fontFamily: "ui-monospace, monospace", color: "var(--accent-kpi-blue, #38bdf8)" }}>
                      {rec.recordId}
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        backgroundColor: "var(--border-color, #334155)",
                        color: "var(--text-primary, #f8fafc)",
                        fontWeight: 700,
                      }}
                    >
                      {rec.dept}
                    </span>
                  </td>

                  <td style={{ padding: "10px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 700 }}>{rec.asset}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)" }}>{rec.category}</div>
                  </td>

                  <td style={{ padding: "10px", verticalAlign: "top", color: "var(--text-secondary, #cbd5e1)" }}>
                    {rec.rawObserved}
                  </td>

                  <td style={{ padding: "10px", verticalAlign: "top" }}>
                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "var(--danger, #f87171)",
                        fontWeight: 700,
                        fontSize: "11px",
                        fontFamily: "ui-monospace, monospace",
                        lineHeight: "1.4",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <span>{rec.prediction}</span>
                      {rec.gmt && (
                        <div>
                          <span className="gmt-badge">
                            TRAFFIC LOAD: {rec.gmt}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: "10px", verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: "14px",
                          fontFamily: "ui-monospace, monospace",
                          color: "var(--accent-kpi-blue, #38bdf8)",
                        }}
                      >
                        {rec.urgencyWeight}%
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "1px 5px",
                          borderRadius: "3px",
                          backgroundColor: "#ef4444",
                          color: "#fff",
                          fontWeight: 800,
                        }}
                      >
                        {rec.status}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "10px", verticalAlign: "top", color: "var(--text-secondary, #cbd5e1)" }}>
                    {rec.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
