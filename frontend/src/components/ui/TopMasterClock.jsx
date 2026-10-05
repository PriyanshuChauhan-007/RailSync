import { useEffect, useState } from "react";

export default function TopMasterClock({
  simMinutes = 480, // default 08:00
  onTimeChange,
  isPlaying = true,
  onPlayPauseToggle,
  speed = 1,
  onSpeedChange,
}) {
  const [internalTime, setInternalTime] = useState(simMinutes);
  const [playing, setPlaying] = useState(isPlaying);
  const [multiplier, setMultiplier] = useState(speed);

  // Sync with incoming props if provided from external scrub/reset
  useEffect(() => {
    if (simMinutes !== undefined && Math.abs(simMinutes - internalTime) > 0.1) {
      setInternalTime(simMinutes);
    }
  }, [simMinutes, internalTime]);

  useEffect(() => {
    if (isPlaying !== undefined) setPlaying(isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    if (speed !== undefined) setMultiplier(speed);
  }, [speed]);

  // Clock progression loop
  useEffect(() => {
    if (!playing) return undefined;
    const intervalMs = 250; // tick every quarter-second
    const timer = setInterval(() => {
      const advance = (multiplier * (intervalMs / 1000)) / 4;
      setInternalTime((curr) => {
        const next = (curr + advance) % 1440;
        return next < 0 ? 0 : next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [playing, multiplier]);

  // Synchronize internal progression with parent safely
  useEffect(() => {
    onTimeChange?.(internalTime);
  }, [internalTime, onTimeChange]);

  const formatTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = Math.floor(totalMinutes % 60);
    const hStr = String(hours).padStart(2, "0");
    const mStr = String(mins).padStart(2, "0");
    return `${hStr}:${mStr}`;
  };

  const handleScrub = (event) => {
    const val = Number(event.target.value);
    setInternalTime(val);
    onTimeChange?.(val);
  };

  const handleTogglePlay = () => {
    const nextPlay = !playing;
    setPlaying(nextPlay);
    onPlayPauseToggle?.(nextPlay);
  };

  const handleSpeedSelect = (mult) => {
    setMultiplier(mult);
    onSpeedChange?.(mult);
  };

  const jumpTo = (minutes) => {
    setInternalTime(minutes);
    onTimeChange?.(minutes);
  };

  return (
    <div
      className="top-master-clock-controller"
      style={{
        backgroundColor: "var(--bg-card-subtle, #1e293b)",
        border: "1px solid var(--border-color, #334155)",
        borderRadius: "8px",
        padding: "10px 16px",
        marginBottom: "12px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        color: "var(--text-primary, #f8fafc)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 800,
              color: "var(--accent-kpi-blue, #38bdf8)",
            }}
          >
            OCC TIME WARP &amp; DISPATCH CONTROLLER
          </span>
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "var(--text-primary, #f8fafc)",
            }}
          >
            {formatTime(internalTime)} <small style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)" }}>IST SIM</small>
          </span>
        </div>

        <button
          type="button"
          onClick={handleTogglePlay}
          aria-label={playing ? "Pause simulation" : "Play simulation"}
          style={{
            minWidth: "78px",
            height: "32px",
            padding: "0 12px",
            borderRadius: "5px",
            backgroundColor: playing ? "var(--bg-card, #0f172a)" : "var(--accent-kpi-blue, #0284c7)",
            color: playing ? "var(--accent-kpi-blue, #38bdf8)" : "#ffffff",
            border: "1px solid var(--border-color, #334155)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "12px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>

        <div style={{ display: "inline-flex", borderRadius: "5px", overflow: "hidden", border: "1px solid var(--border-color, #334155)" }}>
          {[1, 5, 15, 60].map((mult) => (
            <button
              key={mult}
              type="button"
              onClick={() => handleSpeedSelect(mult)}
              style={{
                height: "32px",
                padding: "0 10px",
                border: "none",
                borderRight: mult === 60 ? "none" : "1px solid var(--border-color, #334155)",
                backgroundColor: multiplier === mult ? "var(--accent-kpi-blue, #38bdf8)" : "var(--bg-card, #0f172a)",
                color: multiplier === mult ? "#080c14" : "var(--text-secondary, #cbd5e1)",
                fontWeight: 700,
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              {mult}x
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 240px", minWidth: "200px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)", fontFamily: "monospace" }}>00:00</span>
        <input
          type="range"
          min="0"
          max="1439"
          value={Math.round(internalTime)}
          onChange={handleScrub}
          aria-label="Simulation Time Scrubber (00:00 to 23:59 IST)"
          style={{
            flex: 1,
            accentColor: "var(--accent-kpi-blue, #38bdf8)",
            cursor: "pointer",
          }}
        />
        <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)", fontFamily: "monospace" }}>23:59</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)", marginRight: "4px" }}>Jump:</span>
        <button
          type="button"
          onClick={() => jumpTo(510)}
          style={{
            height: "28px",
            padding: "0 9px",
            fontSize: "11px",
            fontWeight: 600,
            borderRadius: "4px",
            backgroundColor: "var(--bg-card, #0f172a)",
            border: "1px solid var(--border-color, #334155)",
            color: "var(--text-secondary, #cbd5e1)",
            cursor: "pointer",
          }}
        >
          Morning Peak (08:30)
        </button>
        <button
          type="button"
          onClick={() => jumpTo(840)}
          style={{
            height: "28px",
            padding: "0 9px",
            fontSize: "11px",
            fontWeight: 600,
            borderRadius: "4px",
            backgroundColor: "var(--bg-card, #0f172a)",
            border: "1px solid var(--border-color, #334155)",
            color: "var(--text-secondary, #cbd5e1)",
            cursor: "pointer",
          }}
        >
          Freight Corridor (14:00)
        </button>
        <button
          type="button"
          onClick={() => jumpTo(90)}
          style={{
            height: "28px",
            padding: "0 9px",
            fontSize: "11px",
            fontWeight: 600,
            borderRadius: "4px",
            backgroundColor: "var(--bg-card, #0f172a)",
            border: "1px solid var(--border-color, #334155)",
            color: "var(--text-secondary, #cbd5e1)",
            cursor: "pointer",
          }}
        >
          Night Block (01:30)
        </button>
      </div>
    </div>
  );
}
