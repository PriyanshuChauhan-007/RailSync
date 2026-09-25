import { useEffect, useState } from "react";
import "./navClock.css";

export default function NavClock() {
  const [timeStr, setTimeStr] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 8);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toTimeString().slice(0, 8));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="nav-ir-clock" title="Indian Railways Operational Master Time (IST) — Synchronized with CRIS COA">
      <span className="nav-clock-pulse" aria-hidden="true" />
      <span className="nav-clock-time">{timeStr} IST</span>
      <span className="nav-clock-label">CRIS SYNC</span>
    </div>
  );
}
