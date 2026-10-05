import { useEffect, useMemo, useState } from "react";
import { demoCorridors } from "./demoCorridors.js";
import { clockLabel, corridorExample, representativeTrains, sectionExtent } from "./railModel.js";
import { MaintenanceMarker, PossessionBlock, RailCallout, RailStations, RailTrack, RailTrain, TrainRakeSvg } from "./RailPrimitives.jsx";

function Evaluation({ example, paused, reduced = false }) {
  const [step, setStep] = useState(reduced ? 6 : 0);
  const [manual, setManual] = useState(null);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (paused || reduced || manual !== null) return undefined;
    const timer = setInterval(() => setStep((value) => Math.min(6, value + 1)), 1300);
    return () => clearInterval(timer);
  }, [paused, reduced, manual, run]);
  const current = reduced && manual === null ? 6 : step;
  const index = manual ?? (current < 3 ? 0 : current < 5 ? 1 : 2);
  const complete = manual !== null || [2, 4, 6].includes(current);
  const state = current === 0 && manual === null ? "SCAN" : complete ? index === 2 ? "FEASIBLE" : "REJECTED" : "TEST";
  const trainId = example?.train?.train_id ?? "TRAIN";
  const taskId = example?.task?.task_id ?? "TASK";
  const sectionId = example?.task?.section_id ?? "SEC";
  const duration = example?.task?.duration_minutes ?? 30;
  const details = [
    `Train ${trainId} · ${clockLabel(example?.train?.entry_time)}–${clockLabel(example?.train?.exit_time)} overlaps the proposed slot.`,
    `${taskId} requires ${duration} min; a ${duration - 1}-minute slot fails duration.`,
    "Illustrative accepted slot. A real plan still requires all CP-SAT checks; this animation does not run the solver.",
  ];
  const labels = ["Occupancy conflict", "Insufficient duration", "Illustrative feasible window"];
  return <div className="rn-evaluation">
    <svg viewBox="0 0 1200 105" className={`rn-evaluation-track is-${state.toLowerCase()}`} aria-label="CP-SAT constraint check">
      <path d="M80 55H1120M80 62H1120" className="rn-rails" />
      <g data-testid="candidate-on-track" className="rn-candidate-on-track" key={`${run}-${index}-${state}`}>
        <rect x={100 + index * 330} y="30" width="300" height="52" rx="5" />
        <text x={250 + index * 330} y="52" textAnchor="middle">{String.fromCharCode(65 + index)} · {state}</text>
        <text x={250 + index * 330} y="72" textAnchor="middle" className="rn-evaluation-label">{labels[index]}</text>
        {!complete && !reduced ? <path d={`M${120 + index * 330} 28v56`} className="rn-scan" /> : null}
      </g>
      <text x="80" y="18" className="rn-telemetry">CP-SAT CONSTRAINT CHECK · {sectionId}</text>
    </svg>
    <div className="rn-candidate-controls">
      {(["A", "B", "C"] ?? []).map((id, i) => <button type="button" key={'eval-cand-'+id} aria-label={`Candidate ${id}: ${labels[i]}`} aria-pressed={index === i}
        onClick={() => setManual(i)} onFocus={() => setManual(i)}>
        <span>{id}</span>{labels[i]}<small>{i < index || (i === index && complete) ? i === 2 ? "✓" : "×" : "—"}</small>
      </button>)}
      <button type="button" onClick={() => { setManual(null); setStep(0); setRun((value) => value + 1); }}>Replay evaluation</button>
    </div>
    <p role="status" className="rn-evaluation-detail">{details[index]}</p>
  </div>;
}

function StageLayer({ stage, corridor, example }) {
  const { task, partner, train, extent } = example ?? {};
  const effectiveExtent = extent ?? { x: 80, width: 300 };
  const center = effectiveExtent.x + effectiveExtent.width / 2;
  const pair = [task, partner].filter(Boolean);
  if (stage === 0) return <RailCallout title="TRAINS CLAIM CAPACITY" detail="● LIVE OCC DISPATCH FEED | 4-ASPECT AUTOMATIC BLOCK INTERLOCKING | ACTIVE RESOLVER" anchor={center} />;
  if (stage === 1) {
    const trd = corridor?.tasks?.find((item) => item?.department === "TRD");
    const markers = [...pair, trd].filter(Boolean);
    return <g>{(markers ?? []).map((item, i) => {
      const at = sectionExtent(corridor, [item.section_id]) ?? { x: 80, width: 200 };
      return <g key={'stage1-'+(item?.task_id ?? 'task-'+i)}><path d={`M${at.x + at.width / 2} 146V183L${110 + i * 175} 194`} className="rn-connector" />
        <MaintenanceMarker task={item} x={110 + i * 175} index={i} /></g>;
    })}<RailCallout title="MAINTENANCE NEEDS ACCESS" detail={`${task?.task_id ?? ''} · ${task?.task_type ?? ''} · ${task?.duration_minutes ?? ''} min`} anchor={center} /></g>;
  }
  if (stage === 2) return <g className="rn-conflict-story">
    <rect x={effectiveExtent.x} y="96" width={effectiveExtent.width} height="62" rx="5" className="rn-conflict-zone" />
    <g transform={`translate(${center} 116)`}><g className="rn-approach"><TrainRakeSvg label={train?.train_id ?? "TRAIN"} /></g></g>
    <MaintenanceMarker task={task} x={center} />
    <RailCallout title="WINDOWS COLLIDE · ILLUSTRATIVE OVERLAP" detail={`${train?.train_id ?? ''} · ${clockLabel(train?.entry_time)}–${clockLabel(train?.exit_time)} occupies ${task?.section_id ?? ''}`} anchor={center} tone="is-conflict" />
  </g>;
  if (stage === 3) return <g><rect x={effectiveExtent.x} y="99" width={effectiveExtent.width} height="57" rx="5" className="rn-working-section" /><RailCallout title="THIS SECTION IS UNDER EVALUATION" detail="Follow the candidate checks below. Other corridors stay in view." anchor={center} /></g>;
  return <g className="rn-coordination-story">
    {(pair ?? []).map((item, i) => <MaintenanceMarker task={item} x={center + (i ? 95 : -95)} y={200} index={i} merging key={'coord-'+(item?.task_id ?? 'pair-'+i)} />)}
    <PossessionBlock x={effectiveExtent.x} width={effectiveExtent.width} label={partner ? "ENG + S&T" : "MAINTENANCE"} className="rn-lock-in" />
    <RailCallout title="ONE WINDOW. MULTIPLE TASKS." detail={partner ? `${task?.task_id} + ${partner?.task_id} · compatible work shares access.` : "A maintenance possession uses the available section window."} anchor={center} tone="is-feasible" />
  </g>;
}

function CorridorBand({ corridor, focused, quiet, stage, paused }) {
  const trains = useMemo(() => representativeTrains(corridor, corridor?.trains ?? []), [corridor]);
  const example = useMemo(() => corridorExample(corridor), [corridor]);
  return <section className={`rn-corridor ${focused ? "is-focused" : ""} ${quiet ? "is-quiet" : ""}`} aria-label={corridor?.name}>
    <header className="rn-corridor-heading"><h3>{corridor?.name}</h3><span>{(corridor?.stations?.length ?? 0)} stations · {(corridor?.sections?.length ?? 0)} sections <i aria-hidden="true" /></span></header>
    <div className="rn-band-scroll"><svg viewBox={quiet ? "0 65 1200 95" : "0 0 1200 240"} className="rn-band-scene" role="img" aria-label={`${corridor?.name} railway schematic`}>
      <RailTrack territory={corridor} />
      <RailStations territory={corridor} />
      <g className={`rn-traffic ${stage > 0 ? "is-background" : ""} ${focused && stage >= 2 ? "is-story-background" : ""}`}>
        {(trains ?? []).map((train, index) => <RailTrain key={'train-'+(train?.id ?? 'idx-'+index)} train={train} index={index} />)}
      </g>
      {!quiet ? <g key={stage} className={`rn-stage-layer ${paused ? "is-paused" : ""}`}><StageLayer stage={stage} corridor={corridor} example={example} /></g> : null}
    </svg></div>
  </section>;
}

export default function RailwaySchematic({ stage }) {
  const [selected, setSelected] = useState("all");
  const [paused, setPaused] = useState(false);
  const focus = selected !== "all" ? selected : stage >= 2 ? (demoCorridors?.[0]?.territory_id ?? "delhi_agra") : null;
  const corridor = (demoCorridors ?? []).find((item) => item?.territory_id === focus) ?? demoCorridors?.[0] ?? {};
  return <div className={`rn-network ${paused ? "is-paused" : ""}`} data-testid="rail-network">
    <div className="rn-network-toolbar">
      <div className="rn-corridor-selector" role="group" aria-label="Choose corridor">
        <button type="button" aria-pressed={selected === "all"} onClick={() => setSelected("all")}>All corridors</button>
        {(demoCorridors ?? []).map((item, idx) => <button type="button" key={item?.territory_id ?? 'corridor-btn-'+idx} aria-pressed={selected === item?.territory_id} onClick={() => setSelected(item?.territory_id)}>{item?.name}</button>)}
      </div>
      <button className="rn-motion-toggle" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? "Resume motion" : "Pause motion"}</button>
    </div>
    <div className="rn-canvas-caption"><span>{(demoCorridors?.length ?? 4)} public corridors · separate railway bands</span><span>{focus ? `Focus: ${corridor?.name}` : "Network overview"}</span></div>
    <div className="rn-bands">{(demoCorridors ?? []).map((item, idx) => <CorridorBand key={item?.territory_id ?? 'corridor-'+idx} corridor={item} focused={focus === item?.territory_id} quiet={!!focus && focus !== item?.territory_id} stage={stage} paused={paused} />)}</div>
    {stage === 3 && corridor?.territory_id ? <Evaluation key={'eval-'+corridor.territory_id} example={corridorExample(corridor)} paused={paused} /> : null}
  </div>;
}
