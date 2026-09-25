import { useSimulationTime } from "../../context/SimulationTimeContext.jsx";
import "./navClock.css";

export default function NavClock() {
  const { formattedTime } = useSimulationTime();

  return (
    <div className="nav-ir-clock" title="Indian Railways Operational Master Time (IST) — Synchronized with CRIS COA">
      <span className="nav-clock-pulse" aria-hidden="true" />
      <span className="nav-clock-time">{formattedTime}</span>
      <span className="nav-clock-label">CRIS SYNC</span>
    </div>
  );
}

