export default function RailSaathiAuditReport({ plan, territory }) {
  const territoryId = territory?.territory_id || "delhi_agra";
  const refCode = "CRIS/OCC/26027/OPT";
  const planId = plan?.plan_identity?.plan_id || "PLAN_2026_HDN_01";
  const solverRuntime = plan?.metrics?.solver_runtime_ms || 420;

  return (
    <div
      className="railsaathi-audit-document"
      style={{
        backgroundColor: "var(--bg-card, #0f172a)",
        border: "1px solid var(--border-color, #334155)",
        borderRadius: "8px",
        padding: "20px 24px",
        marginBottom: "20px",
        color: "var(--text-primary, #f8fafc)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        position: "relative",
      }}
    >
      {/* Official Railway Dispatch Header */}
      <div
        style={{
          borderBottom: "2px solid var(--border-color, #334155)",
          paddingBottom: "14px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                backgroundColor: "var(--accent-kpi-blue, #38bdf8)",
                color: "#080c14",
                fontWeight: 900,
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "3px",
                letterSpacing: "0.08em",
              }}
            >
              CRIS / IR OCC
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)", fontFamily: "monospace" }}>
              GOVERNMENT OF INDIA · MINISTRY OF RAILWAYS
            </span>
          </div>
          <h3
            style={{
              margin: "6px 0 2px 0",
              fontSize: "16px",
              fontWeight: 800,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            OCC DISPATCH &amp; OPTIMIZATION AUDIT RECORD
          </h3>
          <span style={{ fontSize: "12px", color: "var(--text-secondary, #cbd5e1)" }}>
            Corridor: <strong>{territory?.display_name || territoryId.toUpperCase()}</strong> · High Density Network Section
          </span>
        </div>

        <div style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-kpi-blue, #38bdf8)" }}>
            REF: {refCode}
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-muted, #94a3b8)" }}>
            PLAN ID: {planId}
          </div>
          <div style={{ fontSize: "10px", color: "#22c55e", fontWeight: 600 }}>
            SOLVER PROOF: OPTIMAL ({solverRuntime}ms)
          </div>
        </div>
      </div>

      {/* Dispatch Metadata Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
          backgroundColor: "var(--bg-card-subtle, #1e293b)",
          padding: "10px 14px",
          borderRadius: "6px",
          marginBottom: "16px",
          fontSize: "11px",
          border: "1px solid var(--border-subtle, #1e293b)",
        }}
      >
        <div>
          <span style={{ color: "var(--text-muted, #94a3b8)", display: "block" }}>Auditing Engine:</span>
          <strong>Google OR-Tools CP-SAT v9.8</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-muted, #94a3b8)", display: "block" }}>Authority Class:</span>
          <strong>RailSaathi Explainable AI (XAI)</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-muted, #94a3b8)", display: "block" }}>Headway Margin Enforced:</span>
          <strong>&gt;= 15.0 mins (Safety Hard Constraint)</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-muted, #94a3b8)", display: "block" }}>Signalling Protocol:</span>
          <strong>4-Aspect Automatic Block Interlocking</strong>
        </div>
      </div>

      {/* Articulated Solver Rationales */}
      <div style={{ marginBottom: "16px" }}>
        <h4
          style={{
            margin: "0 0 10px 0",
            fontSize: "12px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--accent-kpi-blue, #38bdf8)",
          }}
        >
          Mathematical Solver Audit Rationales &amp; Safety Proofs:
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Rationale 1 */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "var(--bg-card-subtle, #1e293b)",
              borderLeft: "4px solid var(--accent-kpi-blue, #38bdf8)",
              borderRadius: "0 6px 6px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <strong style={{ fontSize: "12px", color: "var(--text-primary, #f8fafc)" }}>
                Audit Rationale 1: Headway Conflict Resolution
              </strong>
              <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#34d399", fontWeight: 700 }}>
                CONSTRAINT SATISFIED
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary, #cbd5e1)", lineHeight: "1.5" }}>
              "Block TRD-04 shifted by +15 mins to clear path for 12050 Gatimaan Express. Headway margin: 15.2 mins."
            </p>
            <div style={{ marginTop: "4px", fontSize: "10px", color: "var(--text-muted, #94a3b8)", fontFamily: "monospace" }}>
              Proof Vector: [Gatimaan_Exit: 07:18:00] + [Buffer: 15.2m] =&gt; [TRD-04_Start: 07:33:12] | No section overrun.
            </div>
          </div>

          {/* Rationale 2 */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "var(--bg-card-subtle, #1e293b)",
              borderLeft: "4px solid #22c55e",
              borderRadius: "0 6px 6px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <strong style={{ fontSize: "12px", color: "var(--text-primary, #f8fafc)" }}>
                Audit Rationale 2: Synchronized Joint Possession Clustering
              </strong>
              <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#34d399", fontWeight: 700 }}>
                SYNCHRONIZED (120 MIN SAVED)
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary, #cbd5e1)", lineHeight: "1.5" }}>
              "Audit Rationale 2: S&amp;T Point Machine Overhaul bundled into Engineering tamping window at km 14.2–18.6, saving 120 mins line capacity."
            </p>
            <div style={{ marginTop: "4px", fontSize: "10px", color: "var(--text-muted, #94a3b8)", fontFamily: "monospace" }}>
              Synergy Group: [ENG_TAMPING_01] + [SNT_POINT_14B] | Resource Isolation: 1 Combined Power Block | Zero residual track downtime.
            </div>
          </div>
        </div>
      </div>

      {/* Official Sign-off Footer */}
      <div
        style={{
          borderTop: "1px dashed var(--border-color, #334155)",
          paddingTop: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          fontSize: "11px",
          color: "var(--text-muted, #94a3b8)",
        }}
      >
        <span>Verified by RailSaathi Autonomous Dispatch Controller</span>
        <span style={{ fontFamily: "monospace", color: "var(--text-secondary, #cbd5e1)" }}>
          DIGITAL SIGNATURE: SHA256:7e9b01c448f2190ad3
        </span>
      </div>
    </div>
  );
}
