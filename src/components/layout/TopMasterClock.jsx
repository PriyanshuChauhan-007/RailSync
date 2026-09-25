import { useEffect, useRef, useState } from "react";

export default function TopMasterClock({
  simulatedTime,
  onTimeChange,
  isPaused: externalPaused,
  onTogglePause,
}) {
  const [internalSeconds, setInternalSeconds] = useState(() => {
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  });
  const [isPaused, setIsPaused] = useState(externalPaused ?? false);
  const [multiplier, setMultiplier] = useState(1);
  const timerRef = useRef(null);

  // Sync with external paused state if provided
  useEffect(() => {
    if (externalPaused !== undefined) {
      setIsPaused(externalPaused);
    }
  }, [externalPaused]);

  // Tick simulation
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setInternalSeconds((prev) => {
        const next = (prev + multiplier) % 86400;
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, multiplier]);

  // Format 24-hour military time string
  const hours = Math.floor(internalSeconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((internalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = (internalSeconds % 60).toString().padStart(2, "0");
  const formattedTime = `${hours}:${minutes}:${seconds} IST`;

  const togglePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    onTogglePause?.(next);
  };

  const jumpTo = (hour, minute) => {
    const sec = hour * 3600 + minute * 60;
    setInternalSeconds(sec);
    onTimeChange?.(sec);
  };

  const handleSliderChange = (e) => {
    const sec = parseInt(e.target.value, 10);
    setInternalSeconds(sec);
    onTimeChange?.(sec);
  };

  return (
    <div className="ir-master-clock-bar" role="region" aria-label="Indian Railways Master Operational Clock">
      <div className="ir-clock-left">
        <div className="ir-telemetry-badge">
          <span className="ir-telemetry-dot" aria-hidden="true" />
          <span className="ir-telemetry-text">ONLINE / CRIS COA SYNC</span>
        </div>
        <div className="ir-digital-clock" aria-label={`Current simulation time: ${formattedTime}`}>
          <span className="ir-clock-digits">{formattedTime}</span>
          <span className="ir-clock-zone">NORTHERN / WESTERN OCC CONSOLE</span>
        </div>
      </div>

      <div className="ir-clock-center">
        <div className="ir-clock-controls">
          <button
            type="button"
            className={`ir-clock-play-btn ${isPaused ? "is-paused" : "is-playing"}`}
            onClick={togglePause}
            aria-label={isPaused ? "Resume simulation time" : "Pause simulation time"}
          >
            {isPaused ? "▶ PLAY" : "⏸ PAUSE"}
          </button>

          <div className="ir-clock-multipliers" role="group" aria-label="Simulation speed multiplier">
            {[1, 5, 15, 60].map((rate) => (
              <button
                key={rate}
                type="button"
                className={`ir-clock-rate-btn ${multiplier === rate ? "is-active" : ""}`}
                onClick={() => setMultiplier(rate)}
                aria-pressed={multiplier === rate}
              >
                {rate}x
              </button>
            ))}
          </div>

          <div className="ir-clock-quick-jumps" role="group" aria-label="Operational shift quick jumps">
            <button
              type="button"
              className="ir-clock-jump-btn"
              onClick={() => jumpTo(8, 30)}
              title="Jump to Morning Suburban & Express Peak (08:30 IST)"
            >
              Morning Peak
            </button>
            <button
              type="button"
              className="ir-clock-jump-btn"
              onClick={() => jumpTo(14, 0)}
              title="Jump to Heavy Freight Transit Window (14:00 IST)"
            >
              Freight Corridor
            </button>
            <button
              type="button"
              className="ir-clock-jump-btn"
              onClick={() => jumpTo(1, 30)}
              title="Jump to Primary Night Maintenance Possession Slot (01:30 IST)"
            >
              Night Block Window
            </button>
          </div>
        </div>

        <div className="ir-clock-scrubber-row">
          <label htmlFor="ir-sim-scrubber" className="ir-scrubber-label">
            Simulation Horizon ({hours}:{minutes})
          </label>
          <input
            id="ir-sim-scrubber"
            type="range"
            min={0}
            max={86399}
            step={60}
            value={internalSeconds}
            onChange={handleSliderChange}
            className="ir-clock-scrubber"
            aria-label="Scrub simulation time across 24-hour day"
          />
          <span className="ir-scrubber-bounds">00:00 → 23:59 IST</span>
        </div>
      </div>
    </div>
  );
}
