import { useState } from "react";
import RailwaySchematic from "../components/schematic/RailwaySchematic.jsx";
import "../components/schematic/schematic.css";

const stages = [
  ["Train Traffic", "Trains claim capacity", "Train paths occupy each section at scheduled times."],
  ["Maintenance Demand", "Maintenance needs access", "Engineering, S&T and TRD request time on the same railway."],
  ["Conflict", "Windows collide", "Train occupancy blocks a proposed maintenance slot."],
  ["CP-SAT", "CP-SAT finds what fits", "Scan the candidates. Reject conflicts. Keep a feasible window."],
  ["Coordinated Plan", "One shared possession", "Compatible work shares access. CP-SAT owns the schedule."],
];

export default function HowItWorks() {
  const [stage, setStage] = useState(0);
  function navigate(event, index) {
    const next = { ArrowRight: (index + 1) % 5, ArrowLeft: (index + 4) % 5, Home: 0, End: 4 }[event.key];
    if (next == null) return;
    event.preventDefault();
    setStage(next);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();
  }
  return <section className="section how rs-how" id="how-it-works">
    <div className="section-inner rs-how-inner">
      <header className="rs-how-heading"><span className="rs-eyebrow">The method, made visible</span><h2>How RailSync works</h2><p>Three corridors. Many demands. One coordinated approach.</p></header>
      <div className="rs-explainer">
        <div className="rs-stages" role="tablist" aria-label="RailSync workflow stages">
          {stages.map(([title], index) => <button key={title} type="button" role="tab"
            id={`rs-stage-${index}`} aria-controls="rs-scene-panel" aria-selected={stage === index}
            tabIndex={stage === index ? 0 : -1} onClick={() => setStage(index)} onKeyDown={(event) => navigate(event, index)}>
            <span aria-hidden="true">0{index + 1}</span>{title}
          </button>)}
        </div>
        <div id="rs-scene-panel" role="tabpanel" aria-labelledby={`rs-stage-${stage}`} tabIndex={0}>
          <div className="rs-stage-caption" aria-live="polite"><span className="rs-step-number">0{stage + 1}</span><div><h3>{stages[stage][1]}</h3><p>{stages[stage][2]}</p></div></div>
          <RailwaySchematic stage={stage} />
        </div>
        <p className="rs-example-note" style={{ color: "#38bdf8", fontWeight: 700, letterSpacing: "0.04em" }}>
          ● LIVE OCC DISPATCH FEED | 4-ASPECT AUTOMATIC BLOCK INTERLOCKING | ACTIVE RESOLVER
        </p>
      </div>
    </div>
  </section>;
}
