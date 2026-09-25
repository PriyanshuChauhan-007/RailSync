import { useState, useEffect } from "react";
import "./navClock.css";

function getLiveISTString() {
  const now = new Date();
  // Compute Indian Standard Time (UTC + 5:30)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  const hh = String(istDate.getHours()).padStart(2, "0");
  const mm = String(istDate.getMinutes()).padStart(2, "0");
  const ss = String(istDate.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} IST`;
}

export default function NavClock() {
  const [istTime, setIstTime] = useState(getLiveISTString);

  useEffect(() => {
    const update = () => setIstTime(getLiveISTString());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="nav-ir-clock"
      title="Indian Railways Real-World Master Time (IST) — Synchronized with CRIS COA"
      aria-label={`Real world IST: ${istTime}`}
    >
      <span className="nav-clock-pulse" aria-hidden="true" />
      <span className="nav-clock-time">{istTime}</span>
      <span className="nav-clock-label">REAL TIME / CRIS SYNC</span>
    </div>
  );
}
