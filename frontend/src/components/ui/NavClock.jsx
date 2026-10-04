import { useEffect, useState } from "react";

export default function NavClock() {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Formatter for Indian Standard Time (Asia/Kolkata)
      const formatted = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);
      setTimeStr(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="nav-clock-container"
      role="timer"
      aria-label="Current Indian Standard Time"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "4px 12px",
        borderRadius: "6px",
        backgroundColor: "var(--bg-card-subtle, #1e293b)",
        border: "1px solid var(--border-color, #334155)",
        fontSize: "12px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        color: "var(--text-primary, #f8fafc)",
        letterSpacing: "0.04em",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          color: "var(--accent-kpi-blue, #38bdf8)",
          fontWeight: 700,
        }}
      >
        <span
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            backgroundColor: "#22c55e",
            boxShadow: "0 0 6px #22c55e",
            display: "inline-block",
          }}
          aria-hidden="true"
        />
        {timeStr ? `${timeStr} IST` : "--:--:-- IST"}
      </span>
      <span
        style={{
          fontSize: "10px",
          color: "var(--text-muted, #94a3b8)",
          fontWeight: 600,
          borderLeft: "1px solid var(--border-color, #334155)",
          paddingLeft: "8px",
          textTransform: "uppercase",
        }}
      >
        REAL TIME / CRIS SYNC
      </span>
    </div>
  );
}
