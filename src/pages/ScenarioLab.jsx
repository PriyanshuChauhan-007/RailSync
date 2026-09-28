import { useEffect, useRef, useState } from "react";
import Navbar from "../components/layout/Navbar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Button from "../components/ui/Button.jsx";
import DataAssumptions from "../components/analysis/DataAssumptions.jsx";
import OutstandingWork from "../components/analysis/OutstandingWork.jsx";
import RiskControls, { RiskResult } from "../components/planning/RiskControls.jsx";
import { riskOptions } from "../utils/risk.js";
import RecoveryTimeline from "../components/planning/RecoveryTimeline.jsx";
import { adoptRecoveredPlan, reoptimizePlan, getTerritory, getTasks, getTrains, optimizePlan } from "../services/api.js";
import { proofLabel, sectionLabel, territoryLabel, trainFullLabel } from "../utils/planningLabels.js";
import "./scenario/scenario.css";
import "./analysis/analysis.css";

export default function ScenarioLab({ session, setSession, onNavigate, onHome }) {
  const { plan, territory, trains, tasks, recovery, riskConfig } = session;
  const [loadingBase, setLoadingBase] = useState(!plan || !territory);
  const trainIds = [...new Set((trains || []).map((r) => r.train_id))];
  const defaultTrain = trainIds.includes("12050") ? "12050" : trainIds[0] || "";
  const [trainId, setTrainId] = useState(recovery?.disruption?.train_id ?? defaultTrain);
  const [delay, setDelay] = useState(recovery?.disruption?.delay_minutes ?? 25);
  const [scenarioType, setScenarioType] = useState(recovery?.disruption?.type ?? "TRAIN_DELAY");
  const [sectionId, setSectionId] = useState(territory?.sections?.[0]?.section_id ?? "");
  const [crewType, setCrewType] = useState(
    territory?.resources?.crew?.[0]?.resource_id ?? "TRACK_CREW"
  );
  const [machineType, setMachineType] = useState(territory?.resources?.machines?.[0]?.resource_id ?? "TOWER_WAGON");
  const [effectiveTime, setEffectiveTime] = useState(
    plan?.planning_context?.horizon_start?.slice(0, 16) || territory?.planning_horizon?.start_time?.slice(0, 16) || "2026-09-10T00:00"
  );
  const [outageEndTime, setOutageEndTime] = useState(
    plan?.planning_context?.horizon_end?.slice(0, 16) || territory?.planning_horizon?.end_time?.slice(0, 16) || "2026-09-10T12:30"
  );
  const [busy, setBusy] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const [error, setError] = useState(null);
  const [adoptionMessage, setAdoptionMessage] = useState("");
  const controller = useRef(null);

  const activeTrainId = trainId || defaultTrain || trainIds[0] || "";
  const activeSectionId = sectionId || territory?.sections?.[0]?.section_id || "";
  const activeCrewType = crewType || territory?.resources?.crew?.[0]?.resource_id || "TRACK_CREW";
  const activeMachineType = machineType || territory?.resources?.machines?.[0]?.resource_id || "TOWER_WAGON";

  useEffect(() => () => controller.current?.abort(), []);

  // Auto-initialize baseline territory & plan if navigating directly to Scenario Lab
  useEffect(() => {
    if (!session.plan || !session.territory) {
      setLoadingBase(true);
      const abortCtrl = new AbortController();
      const terrId = session.territoryId || "delhi_agra";
      Promise.all([
        getTerritory(terrId, { signal: abortCtrl.signal }),
        getTasks(terrId, { signal: abortCtrl.signal }),
        getTrains(terrId, { signal: abortCtrl.signal }),
        optimizePlan(terrId, { signal: abortCtrl.signal }),
      ])
        .then(([loadedTerritory, taskRes, trainRes, planRes]) => {
          setSession((curr) => ({
            ...curr,
            territoryId: terrId,
            territory: loadedTerritory,
            tasks: taskRes.tasks || [],
            trains: trainRes.trains || [],
            plan: planRes,
          }));
          if (loadedTerritory?.sections?.[0]?.section_id) {
            setSectionId(loadedTerritory.sections[0].section_id);
          }
          if (trainRes.trains?.[0]?.train_id) {
            setTrainId(trainRes.trains[0].train_id);
          }
          if (planRes?.planning_context?.horizon_start) {
            setEffectiveTime(planRes.planning_context.horizon_start.slice(0, 16));
          }
          if (planRes?.planning_context?.horizon_end) {
            setOutageEndTime(planRes.planning_context.horizon_end.slice(0, 16));
          }
          setLoadingBase(false);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setLoadingBase(false);
          }
        });
      return () => abortCtrl.abort();
    } else {
      setLoadingBase(false);
    }
  }, [session.plan, session.territory, session.territoryId, setSession]);

  // Keep state updated if territory or plan loads/changes
  useEffect(() => {
    if (trainIds.length > 0 && (!trainId || !trainIds.includes(trainId))) {
      setTrainId(trainIds.includes("12050") ? "12050" : trainIds[0]);
    }
    if (territory?.sections?.length > 0 && (!sectionId || !territory.sections.some((s) => s.section_id === sectionId))) {
      setSectionId(territory.sections[0].section_id);
    }
    if (plan?.planning_context?.horizon_start && (!effectiveTime || effectiveTime === "2026-09-10T00:00")) {
      setEffectiveTime(plan.planning_context.horizon_start.slice(0, 16));
    }
    if (plan?.planning_context?.horizon_end && (!outageEndTime || outageEndTime === "2026-09-10T12:30")) {
      setOutageEndTime(plan.planning_context.horizon_end.slice(0, 16));
    }
    if (territory?.resources?.crew?.length > 0 && !crewType) {
      setCrewType(territory.resources.crew[0].resource_id || "TRACK_CREW");
    }
    if (territory?.resources?.machines?.length > 0 && !machineType) {
      setMachineType(territory.resources.machines[0].resource_id || "TOWER_WAGON");
    }
  }, [trains, territory, plan]);

  async function runScenario(event) {
    event.preventDefault();
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    setBusy(true);
    setError(null);
    setAdoptionMessage("");

    try {
      const defaultStart = plan?.planning_context?.horizon_start || territory?.planning_horizon?.start_time || "2026-09-10T00:00:00";
      const defaultEnd = plan?.planning_context?.horizon_end || territory?.planning_horizon?.end_time || "2026-09-10T12:30:00";

      const normalizeTime = (val, fallback) => {
        if (!val) return fallback;
        if (val.length === 16) return `${val}:00`;
        return String(val).replace(/(:[0-9]{2}):[0-9]{2}$/, "$1");
      };

      const effective_time = normalizeTime(effectiveTime, defaultStart);
      const end_time = normalizeTime(outageEndTime, defaultEnd);

      const disruptions = {
        TRAIN_DELAY: { type: "TRAIN_DELAY", train_id: activeTrainId, delay_minutes: Number(delay) || 25, effective_time },
        CREW_UNAVAILABLE: { type: "CREW_UNAVAILABLE", crew_type: activeCrewType, start_time: effective_time, end_time, effective_time },
        MACHINE_UNAVAILABLE: { type: "MACHINE_UNAVAILABLE", machine_type: activeMachineType, start_time: effective_time, end_time, effective_time },
        POWER_ISOLATION_CANCELLED: { type: "POWER_ISOLATION_CANCELLED", section_ids: [activeSectionId], start_time: effective_time, end_time, effective_time },
        SECTION_UNAVAILABLE: { type: "SECTION_UNAVAILABLE", section_id: activeSectionId, start_time: effective_time, end_time, effective_time },
        WEATHER_RESTRICTION: { type: "WEATHER_RESTRICTION", delay_minutes: Number(delay) || 25, train_ids: [], effective_time },
        EMERGENCY_WORK: {
          type: "EMERGENCY_WORK",
          effective_time,
          task: {
            task_id: `EMERGENCY_${activeSectionId}`,
            department: "ENGINEERING",
            section_id: activeSectionId,
            task_type: "Emergency track inspection",
            duration_minutes: 20,
            criticality: 10,
            urgency: 10,
            overdue_days: 0,
            deadline: defaultEnd,
            requires_power_block: false,
            crew_type: "TRACK_CREW",
            compatibility_group: `EMERGENCY_${activeSectionId}`,
          },
        },
      };

      const chosenDisruption = disruptions[scenarioType] || disruptions.TRAIN_DELAY;
      const result = await reoptimizePlan(plan, chosenDisruption, {
        signal: requestController.signal,
        ...riskOptions(riskConfig),
      });

      if (requestController.signal.aborted) return;
      setSession((current) => ({ ...current, recovery: result }));
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err);
      }
    } finally {
      if (!requestController.signal.aborted) {
        setBusy(false);
      }
    }
  }

  async function adoptRecovery() {
    if (!recovery) return;
    setAdopting(true);
    setError(null);
    setAdoptionMessage("");
    try {
      const adopted = await adoptRecoveredPlan(
        recovery.recovery_id,
        plan?.plan_identity?.plan_id,
        { signal: controller.current?.signal }
      );
      const retimed = metrics?.shifted_blocks || 0;
      const deferred = metrics?.deferred_blocks ?? metrics?.cancelled_blocks ?? 0;
      setSession((current) => ({
        ...current,
        previousPlan: plan,
        plan: adopted,
        trains: recovery.train_occupancy || current.trains,
        recovery: recovery,
        assistantPreview: null,
      }));
      setAdoptionMessage(
        `✓ Adopted successfully: ${retimed} possession${retimed === 1 ? "" : "s"} retimed · ${deferred} deferred. Planning, Analysis, and RailSaathi now use the adopted plan.`
      );
    } catch (err) {
      if (err.name !== "AbortError") setError(err);
    } finally {
      setAdopting(false);
    }
  }

  const names = new Map((tasks || []).map((t) => [t.task_id, t.task_type]));
  const metrics = recovery?.recovery_metrics || {
    retained_blocks: 0,
    shifted_blocks: 0,
    deferred_blocks: 0,
    cancelled_blocks: 0,
    new_blocks: 0,
    retained_tasks: 0,
    shifted_tasks: 0,
    unscheduled_tasks_after_disruption: 0,
    total_shift_minutes: 0,
  };

  return (
    <div className="scenario-page">
      <Navbar workspace activeWorkspaceView="scenario" onNavigateWorkspace={onNavigate} onHome={onHome} />
      <main className="scenario-main">
        <header className="scenario-hero">
          <span>Scenario Lab</span>
          <h1>What happens when reality changes?</h1>
          <p>
            Apply a time-aware operational disruption. RailSync preserves recorded execution and repairs future work
            while keeping feasible decisions.
          </p>
        </header>

        <div className="scenario-flow">
          <strong>Current plan</strong>
          <span aria-hidden="true">→</span>
          <strong>Disruption</strong>
          <span aria-hidden="true">→</span>
          <strong>Recovered plan</strong>
        </div>

        {loadingBase ? (
          <section className="analysis-empty" role="status">
            <h2>Initializing Scenario Lab...</h2>
            <p>Loading baseline timetable and calculating initial possession schedule.</p>
          </section>
        ) : !plan ? (
          <section className="analysis-empty">
            <h2>Generate a plan in Planning before running a scenario.</h2>
            <p>No base plan is available in this session.</p>
            <Button onClick={() => onNavigate("planning")}>Open Planning</Button>
          </section>
        ) : (
          <>
            <form className="scenario-form" onSubmit={runScenario}>
              <div>
                <span>Current base plan</span>
                <strong>
                  {plan.blocks?.length || 0} possessions · {proofLabel(plan.proof_state)}
                </strong>
                <small>{territoryLabel(territory)}</small>
              </div>

              <label>
                Disruption
                <select
                  aria-label="Disruption type"
                  value={scenarioType}
                  disabled={busy}
                  onChange={(event) => setScenarioType(event.target.value)}
                >
                  <option value="TRAIN_DELAY">Train delay</option>
                  <option value="CREW_UNAVAILABLE">Crew unavailable</option>
                  <option value="MACHINE_UNAVAILABLE">Machine unavailable</option>
                  <option value="POWER_ISOLATION_CANCELLED">Power isolation cancelled</option>
                  <option value="SECTION_UNAVAILABLE">Section unavailable</option>
                  <option value="WEATHER_RESTRICTION">Weather restriction</option>
                  <option value="EMERGENCY_WORK">Emergency work</option>
                </select>
              </label>

              {scenarioType === "TRAIN_DELAY" ? (
                <label>
                  Train
                  <select
                    aria-label="Scenario train"
                    value={trainId || activeTrainId}
                    disabled={busy}
                    onChange={(event) => setTrainId(event.target.value)}
                  >
                    {trainIds.map((id) => (
                      <option key={id} value={id}>
                        {trainFullLabel(id, territory)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {["TRAIN_DELAY", "WEATHER_RESTRICTION"].includes(scenarioType) ? (
                <label>
                  Delay (minutes)
                  <input
                    aria-label="Delay minutes"
                    type="number"
                    min="0"
                    max="1440"
                    step="1"
                    required
                    value={delay}
                    disabled={busy}
                    onChange={(event) => setDelay(event.target.value)}
                  />
                </label>
              ) : null}

              {["POWER_ISOLATION_CANCELLED", "SECTION_UNAVAILABLE", "EMERGENCY_WORK"].includes(scenarioType) ? (
                <label>
                  Section
                  <select value={sectionId || activeSectionId} onChange={(event) => setSectionId(event.target.value)}>
                    {(territory?.sections || []).map((section) => (
                      <option value={section.section_id} key={section.section_id}>
                        {sectionLabel(territory, section.section_id)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {scenarioType === "CREW_UNAVAILABLE" ? (
                <label>
                  Crew pool
                  <select value={crewType || activeCrewType} onChange={(event) => setCrewType(event.target.value)}>
                    {(territory?.resources?.crew ?? []).map((item) => (
                      <option key={item.resource_id} value={item.resource_id}>
                        {item.resource_id}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {scenarioType === "MACHINE_UNAVAILABLE" ? (
                <label>
                  Machine pool
                  <select value={machineType || activeMachineType} onChange={(event) => setMachineType(event.target.value)}>
                    {(territory?.resources?.machines ?? []).map((item) => (
                      <option key={item.resource_id} value={item.resource_id}>
                        {item.resource_id}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label>
                Effective time
                <input
                  type="datetime-local"
                  value={effectiveTime}
                  onChange={(event) => setEffectiveTime(event.target.value)}
                />
              </label>

              {["CREW_UNAVAILABLE", "MACHINE_UNAVAILABLE", "POWER_ISOLATION_CANCELLED", "SECTION_UNAVAILABLE"].includes(
                scenarioType
              ) ? (
                <label>
                  Outage ends
                  <input
                    type="datetime-local"
                    value={outageEndTime}
                    min={effectiveTime}
                    onChange={(event) => setOutageEndTime(event.target.value)}
                  />
                </label>
              ) : null}

              <Button type="submit" disabled={busy || (scenarioType === "TRAIN_DELAY" && !activeTrainId)} ariaBusy={busy}>
                {busy ? "Recovering plan…" : "Run Scenario"}
              </Button>
            </form>

            <p className="scenario-note">
              Simulation only — recovered changes are not automatically applied. Each run starts from the base plan.
            </p>

            <RiskControls
              config={riskConfig}
              onChange={(config) => setSession((current) => ({ ...current, riskConfig: config }))}
              trains={trains || []}
              territory={territory}
              disabled={busy}
            />

            {busy ? <p role="status">Recomputing protected train windows and solving minimum-change recovery…</p> : null}
            {error ? (
              <div className="scenario-error" role="alert">
                <strong>Scenario failed</strong>
                <p>{error.message}</p>
              </div>
            ) : null}

            {recovery ? (
              <>
                <section className="recovery-summary" aria-labelledby="recovery-heading">
                  <div className="scenario-flow" aria-label="Scenario recovery sequence">
                    <span>CURRENT PLAN</span>
                    <span aria-hidden="true">→</span>
                    <span>DISRUPTION</span>
                    <span aria-hidden="true">→</span>
                    <strong>RECOVERED PLAN</strong>
                  </div>
                  <div className="scenario-section-heading">
                    <div>
                      <span>CP-SAT minimum-change recovery</span>
                      <h2 id="recovery-heading">Recovery result</h2>
                    </div>
                    <strong>{proofLabel(recovery.recovered_plan?.proof_state || "FULLY_OPTIMAL")}</strong>
                  </div>
                  {recovery.recovered_plan?.proof_state !== "FULLY_OPTIMAL" ? (
                    <p className="recovery-proof-note">Valid bounded recovery; minimum change is not fully proven.</p>
                  ) : null}
                  <p className="recovery-disruption-subhead">
                    <strong>{recovery.disruption?.type?.toLowerCase()?.replaceAll("_", " ") || "Disruption"}</strong> at{" "}
                    <strong>{recovery.disruption?.effective_time ?? plan.planning_context?.horizon_start}</strong>. Original base
                    plan remains preserved; {recovery.immutable_task_ids?.length || 0} task(s) were immutable.
                  </p>
                  <div className="recovery-outcome-cards">
                    <div className="recovery-card card-retained">
                      <span className="recovery-card-label">UNCHANGED</span>
                      <strong>{metrics.retained_blocks}</strong>
                      <small>possessions kept</small>
                    </div>
                    <div className="recovery-card card-shifted">
                      <span className="recovery-card-label">SHIFTED</span>
                      <strong>{metrics.shifted_blocks}</strong>
                      <small>retimed windows</small>
                    </div>
                    <div className="recovery-card card-cancelled">
                      <span className="recovery-card-label">DEFERRED</span>
                      <strong>{metrics.deferred_blocks ?? metrics.cancelled_blocks}</strong>
                      <small>work still outstanding</small>
                    </div>
                    <div className="recovery-card card-new">
                      <span className="recovery-card-label">NEW</span>
                      <strong>{metrics.new_blocks}</strong>
                      <small>rescheduled</small>
                    </div>
                  </div>
                </section>

                <RecoveryTimeline
                  result={recovery}
                  territory={territory}
                  tasks={tasks || []}
                  originalTrains={trains || []}
                />

                <div className="scenario-apply-row">
                  <Button onClick={adoptRecovery} disabled={adopting} ariaBusy={adopting}>
                    {adopting ? "Adopting…" : "Adopt Recovered Plan"}
                  </Button>
                  {recovery.escalation_required ? (
                    <strong>Escalation required: an immutable block was invalidated.</strong>
                  ) : null}
                </div>

                <details className="recovery-technical-details">
                  <summary>View recovery technical details</summary>
                  <div className="recovery-technical-body">
                    <section className="recovery-findings">
                      <h3>Why repair was needed</h3>
                      {recovery.invalidated_blocks?.length ? (
                        <ul>
                          {recovery.invalidated_blocks.map((b) => (
                            <li key={b.block_id}>
                              <strong>{(b.task_ids || []).map((id) => names.get(id) ?? id).join(" + ")}</strong> ({b.block_id}):{" "}
                              {b.reason_code?.replaceAll("_", " ")?.toLowerCase()}.
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No original possession was invalidated by the supplied delay.</p>
                      )}
                    </section>
                    <dl className="recovery-metrics">
                      {[
                        ["Unchanged possessions", metrics.retained_blocks],
                        ["Shifted possessions", metrics.shifted_blocks],
                        ["Deferred groups", metrics.deferred_blocks ?? metrics.cancelled_blocks],
                        ["New groups", metrics.new_blocks],
                        ["Unchanged task starts", metrics.retained_tasks],
                        ["Shifted tasks", metrics.shifted_tasks],
                        ["Outstanding tasks", metrics.unscheduled_tasks_after_disruption],
                        ["Total task displacement", `${metrics.total_shift_minutes} min`],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="scenario-note">
                      Groups match by section and task membership, not block ID. A cancelled group can be regrouped without
                      losing its work. Displacement sums absolute start changes for previously scheduled tasks still scheduled.
                    </p>
                    <p className="recovery-affected-text">
                      <strong>Affected sections:</strong>{" "}
                      {(recovery.affected_sections || []).map((id) => sectionLabel(territory, id)).join("; ") || "None"}
                    </p>
                    <p className="recovery-unscheduled-text">
                      <strong>Newly unscheduled:</strong>{" "}
                      {(recovery.newly_unscheduled_task_ids || []).map((id) => names.get(id) ?? id).join(", ") || "None"}
                    </p>
                    <RiskResult risk={recovery.risk} />
                    <OutstandingWork
                      items={recovery.recovered_plan?.unscheduled_diagnostics || []}
                      territory={territory}
                    />
                  </div>
                </details>
              </>
            ) : null}
            {adoptionMessage ? (
              <p role="status" className="scenario-note">
                {adoptionMessage}
              </p>
            ) : null}
          </>
        )}
        <DataAssumptions territory={session.territory} />
      </main>
      <Footer />
    </div>
  );
}
