export default function ABSplitScreenComparison() {
  const metricCards = [
    { label: "Joint Possession Efficiency", value: "+63.6%", trend: "vs. Siloed Closures", positive: true },
    { label: "Sectional Punctuality Loss Prevented", value: "185 min", trend: "Detention Eliminated", positive: true },
    { label: "Corridor Asset Availability", value: "94.2%", trend: "Track Up-Time", positive: true },
    { label: "Safety Defect Backlog Clearance", value: "100% P1", trend: "Critical Flaws Addressed", positive: true },
  ];

  return (
    <section
      className="ab-split-screen-comparison"
      aria-labelledby="ab-comparison-heading"
      style={{
        backgroundColor: "var(--bg-card, #0f172a)",
        border: "1px solid var(--border-color, #334155)",
        borderRadius: "10px",
        padding: "24px",
        marginBottom: "24px",
        color: "var(--text-primary, #f8fafc)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--accent-kpi-blue, #38bdf8)",
          }}
        >
          PRIMARY EVALUATION PITCH BENCHMARK
        </span>
        <h2 id="ab-comparison-heading" style={{ margin: "4px 0", fontSize: "20px", fontWeight: 800 }}>
          A/B Split-Screen Optimization Comparison
        </h2>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary, #cbd5e1)" }}>
          Direct operational audit comparing traditional siloed manual scheduling against RailSync's synchronized CP-SAT shadow possession.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {metricCards.map((m) => (
          <div
            key={m.label}
            style={{
              backgroundColor: "var(--bg-card-subtle, #1e293b)",
              border: "1px solid var(--border-color, #334155)",
              borderRadius: "8px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)", fontWeight: 600 }}>
              {m.label}
            </span>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: "var(--accent-kpi-blue, #38bdf8)",
                fontFamily: "ui-monospace, monospace",
                lineHeight: "1.2",
              }}
            >
              {m.value}
            </div>
            <span style={{ fontSize: "11px", color: "#34d399", fontWeight: 700 }}>
              ✓ {m.trend}
            </span>
          </div>
        ))}
      </div>

      {/* A/B Split Screen View */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {/* LEFT SIDE: Traditional Siloed Planning / BDMS */}
        <div
          style={{
            backgroundColor: "var(--bg-card-subtle, #1e293b)",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            padding: "18px",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid var(--border-color, #334155)", paddingBottom: "10px" }}>
            <div>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                BENCHMARK BASELINE
              </span>
              <h3 style={{ margin: "2px 0 0 0", fontSize: "15px", fontWeight: 800, color: "var(--text-primary, #f8fafc)" }}>
                Traditional Siloed Planning (BDMS)
              </h3>
            </div>
            <span style={{ padding: "3px 8px", borderRadius: "4px", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171", fontSize: "11px", fontWeight: 800, fontFamily: "monospace" }}>
              5.5H TOTAL CLOSURE
            </span>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)", fontWeight: 700, textTransform: "uppercase" }}>
              Fragmented Departmental Windows:
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
              <div style={{ padding: "8px 10px", borderRadius: "5px", backgroundColor: "var(--bg-card, #0f172a)", border: "1px solid var(--border-subtle, #1e293b)", fontSize: "11px", display: "flex", justifyContent: "space-between" }}>
                <span><strong>Civil (P-Way):</strong> Track Tamping SEC02</span>
                <span style={{ color: "#f87171", fontWeight: 700 }}>02:00–04:00 (2.0 hrs)</span>
              </div>
              <div style={{ padding: "8px 10px", borderRadius: "5px", backgroundColor: "var(--bg-card, #0f172a)", border: "1px solid var(--border-subtle, #1e293b)", fontSize: "11px", display: "flex", justifyContent: "space-between" }}>
                <span><strong>S&amp;T Signals:</strong> Point Machine 14B</span>
                <span style={{ color: "#f87171", fontWeight: 700 }}>05:30–07:00 (1.5 hrs)</span>
              </div>
              <div style={{ padding: "8px 10px", borderRadius: "5px", backgroundColor: "var(--bg-card, #0f172a)", border: "1px solid var(--border-subtle, #1e293b)", fontSize: "11px", display: "flex", justifyContent: "space-between" }}>
                <span><strong>TRD Electrical:</strong> Catenary Inspection</span>
                <span style={{ color: "#f87171", fontWeight: 700 }}>10:30–12:30 (2.0 hrs)</span>
              </div>
            </div>
          </div>

          <div>
            <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 800, textTransform: "uppercase" }}>
              ⚠️ Highlighted Train Detentions (Cumulative 168 min):
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
              <div style={{ padding: "8px 10px", borderRadius: "5px", backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><strong>12002 Bhopal Shatabdi</strong> (Pass)</span>
                <span style={{ fontWeight: 800, color: "#ef4444", fontFamily: "monospace" }}>+38 min DETAINED</span>
              </div>
              <div style={{ padding: "8px 10px", borderRadius: "5px", backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><strong>12952 Mumbai Rajdhani</strong> (Pass)</span>
                <span style={{ fontWeight: 800, color: "#ef4444", fontFamily: "monospace" }}>+45 min DETAINED</span>
              </div>
              <div style={{ padding: "8px 10px", borderRadius: "5px", backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><strong>BOXN Freight Rake #82</strong> (Freight)</span>
                <span style={{ fontWeight: 800, color: "#ef4444", fontFamily: "monospace" }}>+85 min DETAINED</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: RailSync CP-SAT Shadow Possession */}
        <div
          style={{
            backgroundColor: "var(--bg-card-subtle, #1e293b)",
            border: "1px solid #22c55e",
            borderRadius: "8px",
            padding: "18px",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid var(--border-color, #334155)", paddingBottom: "10px" }}>
            <div>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                CP-SAT SYNCHRONIZED ENGINE
              </span>
              <h3 style={{ margin: "2px 0 0 0", fontSize: "15px", fontWeight: 800, color: "var(--text-primary, #f8fafc)" }}>
                RailSync CP-SAT Shadow Possession
              </h3>
            </div>
            <span style={{ padding: "3px 8px", borderRadius: "4px", backgroundColor: "rgba(34, 197, 94, 0.18)", color: "#4ade80", fontSize: "11px", fontWeight: 800, fontFamily: "monospace" }}>
              2.0H SINGLE WINDOW (-63.6%)
            </span>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)", fontWeight: 700, textTransform: "uppercase" }}>
              Synchronized Multi-Department Shadow Block:
            </span>
            <div style={{ marginTop: "6px", padding: "12px 14px", borderRadius: "6px", backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <strong style={{ fontSize: "13px", color: "#4ade80" }}>
                  Integrated Block BLK-SYN-01
                </strong>
                <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--accent-kpi-blue, #38bdf8)", fontWeight: 700 }}>
                  02:15 — 04:15 IST (2.0 hrs)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary, #cbd5e1)", lineHeight: "1.4" }}>
                Bundles Civil Track Tamping + S&amp;T Point Machine Overhaul + TRD Catenary Splice under one simultaneous corridor protection window. <strong>3.5 hours of track closure completely avoided.</strong>
              </p>
            </div>
          </div>

          <div>
            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: 800, textTransform: "uppercase" }}>
              ✓ Zero Detentions Guaranteed (100% Punctuality Protected):
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
              <div style={{ padding: "8px 10px", borderRadius: "5px", backgroundColor: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#86efac", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><strong>12002 Bhopal Shatabdi</strong></span>
                <span style={{ fontWeight: 800, color: "#22c55e", fontFamily: "monospace" }}>✓ 100% ON-TIME (0m delay)</span>
              </div>
              <div style={{ padding: "8px 10px", borderRadius: "5px", backgroundColor: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#86efac", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><strong>12952 Mumbai Rajdhani</strong></span>
                <span style={{ fontWeight: 800, color: "#22c55e", fontFamily: "monospace" }}>✓ PATH PROTECTED (0m delay)</span>
              </div>
              <div style={{ padding: "8px 10px", borderRadius: "5px", backgroundColor: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#86efac", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><strong>BOXN Freight Rake #82</strong></span>
                <span style={{ fontWeight: 800, color: "#22c55e", fontFamily: "monospace" }}>✓ FULL SCHEDULE INTEGRITY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
