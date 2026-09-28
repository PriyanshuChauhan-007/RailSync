import { useState } from "react";
import { buildTicks, durationMinutes, intervalDensity, rangeStyle, timeLabel } from "../../utils/timeline.js";
import { sectionLabel, trainLabel, canonicalTrainId } from "../../utils/planningLabels.js";
import { TimelineGrid } from "../timeline/TimelinePrimitives.jsx";

export default function RecoveryTimeline({ result, territory, tasks = [], originalTrains = [] }) {
  const [selected, setSelected] = useState("");
  const [activeItem, setActiveItem] = useState(null);

  const preferred = result?.invalidated_blocks?.[0]?.block_id;
  const sectionId =
    selected ||
    result?.base_plan?.blocks?.find((b) => b.block_id === preferred)?.section_id ||
    result?.affected_sections?.[0] ||
    territory?.sections?.[0]?.section_id ||
    "";

  const horizon = {
    start_time: result?.horizon_start || territory?.planning_horizon?.start_time || "2026-09-10T00:00:00",
    end_time: result?.horizon_end || territory?.planning_horizon?.end_time || "2026-09-10T12:30:00",
  };
  const ticks = buildTicks(horizon);

  // Map task IDs to human-readable names and departments
  const taskMap = new Map();
  (tasks || []).forEach((t) => {
    taskMap.set(t.task_id, {
      name: t.task_type || t.name || t.task_id,
      department: t.department || "ENGINEERING",
      duration: t.duration_minutes || 20,
    });
  });

  const disruptedTrainIds = new Set([
    result?.disruption?.train_id,
    ...(result?.disruption?.delays ?? []).map((item) => item.train_id),
    ...(result?.disruption?.train_ids ?? []),
  ].filter(Boolean));

  const disruptionDelay = result?.disruption?.delay_minutes ?? 25;

  const lanes = [
    { id: "orig-trains", label: "Original trains", rows: originalTrains || [], train: true, isBefore: true },
    { id: "disr-trains", label: "Disrupted trains", rows: result?.train_occupancy || [], train: true, changed: true },
    { id: "before-blocks", label: "Before recovery", rows: result?.base_plan?.blocks || [], train: false, isBefore: true },
    { id: "rec-blocks", label: "Recovered plan", rows: result?.recovered_plan?.blocks || [], train: false, changed: true },
  ];

  const currentSectionName = sectionLabel(territory, sectionId);

  return (
    <section className="recovery-timeline" aria-labelledby="recovery-timeline-heading">
      <div className="scenario-section-heading">
        <div>
          <span>Same section · same time axis</span>
          <h2 id="recovery-timeline-heading">What changed on the railway?</h2>
        </div>
        <label>
          Section
          <select
            aria-label="Recovery timeline section"
            value={sectionId}
            onChange={(event) => {
              setSelected(event.target.value);
              setActiveItem(null);
            }}
          >
            {(territory?.sections || []).map((s) => (
              <option key={s.section_id} value={s.section_id}>
                {sectionLabel(territory, s.section_id)} · {s.section_id}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="recovery-timeline-scroll">
        <div className="recovery-axis">
          <span className="recovery-axis-label">Timeline</span>
          <div className="recovery-axis-ticks">
            {ticks.map((tick, index) => (
              <time
                key={tick.key}
                style={{
                  position: "absolute",
                  left: tick.left,
                  transform:
                    index === 0
                      ? "none"
                      : index === ticks.length - 1
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
                }}
              >
                {tick.label}
              </time>
            ))}
          </div>
        </div>

        {lanes.map((lane) => {
          const laneRows = (lane.rows || []).filter((row) => {
            const sIds = row.section_ids?.length ? row.section_ids : [row.section_id].filter(Boolean);
            return sIds.includes(sectionId);
          });

          return (
            <div className="recovery-lane" key={lane.id}>
              <strong>{lane.label}</strong>
              <div className="recovery-track">
                <TimelineGrid ticks={ticks} />
                {laneRows.length === 0 ? (
                  <span className="recovery-track-empty">
                    No {lane.train ? "train occupancies" : "maintenance possessions"} on this section
                  </span>
                ) : (
                  laneRows.map((row, index) => {
                    const change =
                      !lane.train &&
                      (result?.block_changes || []).find((item) =>
                        lane.changed ? item.after_block_id === row.block_id : item.before_block_id === row.block_id
                      );
                    const isDisrupted = lane.train && lane.changed && disruptedTrainIds.has(row.train_id);
                    const state = lane.train
                      ? isDisrupted
                        ? "DISRUPTED"
                        : "TRAIN"
                      : change?.state ?? (row.integrated ? "RETAINED" : "UNMODIFIED");

                    const start = row.entry_time ?? row.start_time;
                    const end = row.exit_time ?? row.end_time;
                    const durationMins = durationMinutes(start, end);

                    const humanTrain = lane.train ? trainLabel(row.train_id, territory) : "";
                    const canonicalTrain = lane.train ? canonicalTrainId(row.train_id) : "";
                    const taskList = (row.tasks || []).map((id) => taskMap.get(id)?.name || id);
                    const taskSummary = taskList.join(" + ") || "Maintenance task";

                    const density = intervalDensity(start, end, horizon);
                    const isSelected =
                      activeItem &&
                      (activeItem.id === (row.train_id || row.block_id) && activeItem.laneId === lane.id);

                    return (
                      <button
                        type="button"
                        key={`${row.train_id ?? row.block_id}-${lane.id}-${index}`}
                        onClick={() =>
                          setActiveItem({
                            id: row.train_id || row.block_id,
                            laneId: lane.id,
                            isTrain: lane.train,
                            isDisrupted,
                            state,
                            start,
                            end,
                            durationMins,
                            trainName: humanTrain,
                            canonicalTrain,
                            tasks: taskList,
                            row,
                            change,
                          })
                        }
                        className={`recovery-bar ${lane.train ? "is-train-bar" : "is-block-bar"} ${
                          isDisrupted ? "is-disrupted-train" : ""
                        } ${isSelected ? "is-selected-bar" : ""} marker-${density} state-${state.toLowerCase()}`}
                        style={rangeStyle(start, end, horizon)}
                        title={
                          lane.train
                            ? `${humanTrain} (${canonicalTrain}): ${timeLabel(start)}–${timeLabel(end)} · ${
                                isDisrupted ? `Delayed (+${disruptionDelay}m)` : "On schedule"
                              }`
                            : `[${row.block_id}] ${taskSummary}: ${timeLabel(start)}–${timeLabel(end)} (${durationMins}m) · ${state}`
                        }
                      >
                        {lane.train ? (
                          <span className="recovery-train-label">
                            <span className="recovery-train-num">{canonicalTrain}</span>
                            {isDisrupted ? (
                              <span className="recovery-delay-tag">+{disruptionDelay}m</span>
                            ) : (
                              <span className="recovery-train-arrow">⇄</span>
                            )}
                          </span>
                        ) : (
                          <span className="recovery-block-label">
                            <span className="recovery-block-code">{row.block_id}</span>
                            <span className="recovery-block-dur">{durationMins}m</span>
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Item Inspector Panel */}
      {activeItem ? (
        <div className="recovery-inspector">
          <div className="recovery-inspector-header">
            <span className={`recovery-badge state-${activeItem.state.toLowerCase()}`}>
              {activeItem.isTrain
                ? activeItem.isDisrupted
                  ? `Delayed Train (+${disruptionDelay}m)`
                  : "Train Service"
                : activeItem.state}
            </span>
            <strong>
              {activeItem.isTrain
                ? `${activeItem.canonicalTrain} · ${activeItem.trainName}`
                : `Possession ${activeItem.id} · ${activeItem.durationMins} min window`}
            </strong>
            <span className="recovery-inspector-time">
              {timeLabel(activeItem.start)} – {timeLabel(activeItem.end)}
            </span>
            <button
              type="button"
              className="recovery-inspector-close"
              onClick={() => setActiveItem(null)}
              aria-label="Close inspector"
            >
              ×
            </button>
          </div>
          <div className="recovery-inspector-body">
            {activeItem.isTrain ? (
              <p>
                Train <strong>{activeItem.canonicalTrain}</strong> traversing <strong>{currentSectionName}</strong>.{" "}
                {activeItem.isDisrupted
                  ? `Pushed back by ${disruptionDelay} minutes to simulate arrival/departure disruption. Downstream slots adjusted accordingly.`
                  : "Running on designated timetable slot."}
              </p>
            ) : (
              <div>
                <p>
                  Integrated maintenance window scheduled for <strong>{activeItem.durationMins} minutes</strong> with
                  standard 15-minute train clearance safety buffers.
                </p>
                {activeItem.tasks?.length > 0 ? (
                  <div className="recovery-inspector-tasks">
                    <span>Departmental tasks included:</span>
                    <ul>
                      {activeItem.tasks.map((taskName, i) => (
                        <li key={i}>{taskName}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="recovery-legend">
        <span className="recovery-legend-item">
          <i className="recovery-dot state-retained" aria-hidden="true" />
          <span className="recovery-legend-text">Unchanged</span>
        </span>
        <span className="recovery-legend-item">
          <i className="recovery-dot state-shifted" aria-hidden="true" />
          <span className="recovery-legend-text">Shifted</span>
        </span>
        <span className="recovery-legend-item">
          <i className="recovery-dot state-new" aria-hidden="true" />
          <span className="recovery-legend-text">New group</span>
        </span>
        <span className="recovery-legend-item">
          <i className="recovery-dot state-cancelled" aria-hidden="true" />
          <span className="recovery-legend-text">Deferred / Cancelled</span>
        </span>
        <span className="recovery-legend-item">
          <i className="recovery-dot state-disrupted" aria-hidden="true" />
          <span className="recovery-legend-text">Delayed train</span>
        </span>
        <small className="recovery-legend-hint">Click any timeline bar to inspect window details</small>
      </div>

      <p className="scenario-note">
        {result?.disruption?.delay_minutes != null
          ? `Train intervals shift by ${result.disruption.delay_minutes} minutes; their duration is preserved. `
          : "The selected resource or infrastructure input is changed for this recovery run. "}
        Possessions include setup, work and release. Safety buffers are enforced but are not drawn as occupancy.
      </p>

      {/* Change list for this section */}
      <div className="recovery-change-list">
        {(() => {
          const changes = (result?.block_changes || []).filter((item) => {
            const block =
              (result?.base_plan?.blocks || []).find((b) => b.block_id === item.before_block_id) ??
              (result?.recovered_plan?.blocks || []).find((b) => b.block_id === item.after_block_id);
            const sIds = block?.section_ids?.length ? block.section_ids : [block?.section_id || item.section_id].filter(Boolean);
            return sIds.includes(sectionId);
          });

          if (changes.length === 0) {
            return (
              <p className="scenario-note" style={{ fontStyle: "italic", margin: "8px 0" }}>
                No possession shifts required on {currentSectionName} under this scenario; corridor integrity maintained.
              </p>
            );
          }

          return changes.map((item, index) => {
            const before = (result?.base_plan?.blocks || []).find((b) => b.block_id === item.before_block_id);
            const after = (result?.recovered_plan?.blocks || []).find((b) => b.block_id === item.after_block_id);
            const taskLabel =
              (item.task_ids || []).map((id) => taskMap.get(id)?.name || id).join(" + ") || "Maintenance task";
            const blockCode = item.after_block_id || item.before_block_id;

            return (
              <div key={index} className="recovery-change-row">
                <div className="recovery-change-info">
                  <span className={`recovery-badge state-${item.state.toLowerCase()}`}>{item.state}</span>
                  <strong>
                    {blockCode ? `[${blockCode}] ` : ""}
                    {taskLabel}
                  </strong>
                </div>
                <div className="recovery-change-times">
                  <span>
                    {before ? `${timeLabel(before.start_time)}–${timeLabel(before.end_time)}` : "No previous window"}
                  </span>
                  <span className="recovery-change-arrow">→</span>
                  <strong className="recovery-change-newtime">
                    {after ? `${timeLabel(after.start_time)}–${timeLabel(after.end_time)}` : "Deferred"}
                  </strong>
                  {item.displacement_minutes ? (
                    <small className="recovery-shift-tag">+{item.displacement_minutes}m shift</small>
                  ) : null}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </section>
  );
}
