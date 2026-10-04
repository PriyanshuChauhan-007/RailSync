export default function StrategicHorizonView() {
  const weeks = [
    {
      weekNumber: 1,
      title: "Tactical Execution Horizon",
      dates: "Days 1–7",
      status: "ACTIVE TACTICAL",
      isActive: true,
      tasksScheduled: 18,
      possessionHours: 14.5,
      punctualityProtection: "99.8%",
      details: "High-certainty mathematical allocation. All corridor train occupancy locked in CP-SAT with micro-headway safety margins.",
    },
    {
      weekNumber: 2,
      title: "Near-Term Engineering Window",
      dates: "Days 8–14",
      status: "PLANNED",
      isActive: false,
      tasksScheduled: 14,
      possessionHours: 12.0,
      punctualityProtection: "98.5%",
      details: "Track replacement and S&T overhaul bundled. Resource rosters (crews & machines) reserved.",
    },
    {
      weekNumber: 3,
      title: "Mid-Range Outlook & OHE",
      dates: "Days 15–21",
      status: "PROJECTED",
      isActive: false,
      tasksScheduled: 12,
      possessionHours: 10.0,
      punctualityProtection: "97.2%",
      details: "Power isolation coordination with state electrical authorities. Preliminary train diversions mapped.",
    },
    {
      weekNumber: 4,
      title: "Long-Range Maintenance Reserve",
      dates: "Days 22–30",
      status: "BUFFER",
      isActive: false,
      tasksScheduled: 9,
      possessionHours: 8.5,
      punctualityProtection: "96.4%",
      details: "Buffer window for deferred ultrasonic testing and heavy ballast cleaning operations.",
    },
  ];

  return (
    <div
      className="strategic-horizon-container"
      style={{
        backgroundColor: "var(--bg-card, #0f172a)",
        border: "1px solid var(--border-color, #334155)",
        borderRadius: "8px",
        padding: "18px 22px",
        marginBottom: "20px",
        color: "var(--text-primary, #f8fafc)",
      }}
    >
      <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-kpi-blue, #38bdf8)", letterSpacing: "0.05em" }}>
            30-DAY STRATEGIC OCC LOOKAHEAD
          </span>
          <h3 style={{ margin: "2px 0 0 0", fontSize: "15px", fontWeight: 700 }}>
            Corridor Asset Availability &amp; Multi-Week Work Plan
          </h3>
        </div>

        <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)", fontFamily: "monospace" }}>
          HORIZON: 30 DAYS (W1–W4)
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
        {weeks.map((w) => (
          <div
            key={w.weekNumber}
            style={{
              // Strict requirement: all 4 weeks identical borders: border: 1px solid var(--border-color);
              border: "1px solid var(--border-color, #334155)",
              backgroundColor: "var(--bg-card-subtle, #1e293b)",
              borderRadius: "6px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-primary, #f8fafc)" }}>
                Week {w.weekNumber} ({w.dates})
              </span>
              {w.isActive ? (
                // Active tag on Week 1 exactly as requested:
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  ACTIVE TACTICAL
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    backgroundColor: "var(--bg-card, #0f172a)",
                    color: "var(--text-muted, #94a3b8)",
                    border: "1px solid var(--border-subtle, #1e293b)",
                  }}
                >
                  {w.status}
                </span>
              )}
            </div>

            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-kpi-blue, #38bdf8)" }}>
              {w.title}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary, #cbd5e1)", borderTop: "1px solid var(--border-subtle, #1e293b)", paddingTop: "6px" }}>
              <span>Tasks: <strong>{w.tasksScheduled}</strong></span>
              <span>Pos. Hours: <strong>{w.possessionHours}h</strong></span>
              <span>Protection: <strong style={{ color: "#34d399" }}>{w.punctualityProtection}</strong></span>
            </div>

            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--text-muted, #94a3b8)", lineHeight: "1.4" }}>
              {w.details}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
