import { departmentLabel, sectionLabel, trainLabel } from "../../utils/planningLabels.js";
import { timeLabel } from "../../utils/timeline.js";

const readable = (value = "") => value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

export default function PriorityFeasibility({ task, diagnostics, territory }) {
  if (!task || !diagnostics) return null;

  const priority = diagnostics.task_priorities?.find((item) => item.task_id === task.task_id);
  const windows = diagnostics.candidate_windows?.filter((item) => item.task_id === task.task_id) ?? [];
  const feasible = windows.filter((item) => item.feasible);
  const conflicts = diagnostics.conflicts?.filter((item) => item.task_id === task.task_id) ?? [];
  const opportunities = diagnostics.coordination_opportunities?.filter((item) => item.task_ids.includes(task.task_id)) ?? [];

  return (
    <section className="priority-feasibility" aria-labelledby="priority-feasibility-heading">
      <div className="priority-feasibility-heading">
        <div>
          <span className="planner-kicker">Selected maintenance request</span>
          <h2 id="priority-feasibility-heading">Priority &amp; Feasibility</h2>
          <p>{task.task_type} · {departmentLabel(task.department)} · {sectionLabel(territory, task.section_id)}</p>
        </div>
        {priority ? <strong className={`priority-category is-${priority.category.toLowerCase()}`}>{readable(priority.category)}</strong> : null}
      </div>

      {priority ? <>
        <dl className="priority-facts">
          <div><dt>Recorded priority inputs</dt><dd>Criticality {priority.criticality}/10 · Urgency {priority.urgency}/10 · {priority.overdue_days} overdue days</dd></div>
          <div><dt>Solver outcome</dt><dd>{readable(priority.solver_outcome)}</dd></div>
          <div><dt>Candidate windows</dt><dd>{feasible.length} feasible window{feasible.length === 1 ? "" : "s"} of {windows.length}</dd></div>
          <div><dt>Protected traffic</dt><dd>{conflicts.length} recorded train safety exclusion{conflicts.length === 1 ? "" : "s"}</dd></div>
        </dl>
        <p className="priority-method-note">Deterministic category from recorded criticality, urgency, overdue days, and deadline. No ML score is used.</p>
      </> : <p className="priority-method-note">Generate a plan to calculate deterministic priority and feasibility facts.</p>}

      {windows.length ? <div className="diagnostic-columns">
        <div>
          <h3>Candidate windows</h3>
          <ul className="diagnostic-list">{windows.slice(0, 4).map((window) => <li key={window.window_id}>
            <div><strong>{timeLabel(window.usable_start)}–{timeLabel(window.usable_end)}</strong>{window.solver_selected ? <span className="diagnostic-badge is-selected">Selected by CP-SAT</span> : null}</div>
            <small>{window.usable_minutes} usable min · {window.feasible ? "Feasible" : window.reasons.map(readable).join(" · ")}</small>
          </li>)}</ul>
        </div>
        <div>
          <h3>Traffic safety exclusions</h3>
          <ul className="diagnostic-list">{conflicts.slice(0, 4).map((conflict) => <li key={conflict.conflict_id}>
            <div><strong>{trainLabel(conflict.train_id, territory)}</strong><span className={`diagnostic-badge is-${conflict.severity.toLowerCase()}`}>{readable(conflict.severity)}</span></div>
            <small>{timeLabel(conflict.protected_start)}–{timeLabel(conflict.protected_end)} protected · {conflict.minimum_clearance_minutes} min total margin</small>
          </li>)}{!conflicts.length ? <li><small>No recorded train safety exclusions for this task.</small></li> : null}</ul>
        </div>
      </div> : null}

      {opportunities.length ? <p className="coordination-summary"><strong>Coordination:</strong> {opportunities.filter((item) => item.solver_selected_together).length} compatible pairing{opportunities.length === 1 ? "" : "s"} used in this plan.</p> : null}
    </section>
  );
}
