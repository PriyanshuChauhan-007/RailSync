# RailSync SIH 2026 Finalization Design

## Purpose

Turn the existing RailSync prototype into a judge-ready decision-support product without replacing its working architecture or weakening CP-SAT authority. The product must visibly connect maintenance demand, train occupancy, conflicts, feasible windows, optimization, coordination, analysis, disruption recovery, and explanation.

## Non-negotiable architecture

The authoritative flow remains:

`registered data → normalization → deterministic priority/feasibility → OR-Tools CP-SAT → solver-verified plan → analysis/recovery → RailSaathi explanation`

RailSaathi can explain bounded verified context. It cannot invent, apply, or override a schedule. Public timetable-derived data, prototype maintenance/resource inputs, and synthetic scenario events remain visibly distinguished.

## Existing architecture retained

- React 19 + Vite provides Landing, Planning, Analysis, Scenario Lab, and RailSaathi.
- `App.jsx` owns the single browser planning session shared by all workspaces.
- FastAPI delegates to planning, operations, recovery, and copilot services.
- `optimizer/` owns candidate windows, feasibility, compatibility, capacity, CP-SAT optimization, comparison, and recovery.
- Registered JSON territory snapshots remain the only normal planning inputs.
- Baseline and RailSync comparison continue to use the same demand, occupancy, horizon, hard constraints, and CP-SAT engine; only integration policy differs.

## Audit findings and root causes

1. **Theme fragility:** `theme.css` defines useful variables but repairs Night mode with a long selector override list. Other stylesheets still own literal white/navy surfaces, so nested components bypass semantic tokens.
2. **Timeline divergence:** Planning, Analysis, and Scenario timelines reuse `buildTicks` and `rangeStyle`, but duplicate grid/marker markup and label-fitting behavior. Decorative train PNGs remain in Planning and Analysis, and labels overflow narrow intervals.
3. **Recovery propagation bug:** Scenario adoption copies recovered blocks into the old plan object. This preserves stale `analysis`, alternatives, metrics, diagnostics, identity, and copilot context instead of adopting a coherent solver-derived plan version.
4. **Weak default scenario:** the initial 25-minute delay for train 37786 produces no plan change on the default territory. A deterministic test found that train 37814 delayed by 25 minutes invalidates/retimes work and is suitable for the stable judge path.
5. **Hidden intelligence:** optimizer diagnostics already contain task-window feasibility, reason codes, pair checks, boundary slack, and outcomes, but the API drops most candidate-window facts before the frontend receives them.
6. **Risk prominence:** experimental ML is honestly bounded but appears above the primary planning timeline. The main experience should instead expose deterministic priority and feasibility; ML belongs under Advanced/Experimental.
7. **Operational controls:** lifecycle, objective variants, rolling horizons, imports, and exports exist under one generic Plan Tools drawer. The core review state and real candidate variants need better hierarchy; import and ML should remain advanced.
8. **Landing evidence:** the landing page contains a useful workflow explainer, but it skips the visible conflict and rejected-window stages and displays fixed example metrics without clearly separating them from the active session.

## Target state and data flow

### Shared plan state

`App.jsx` remains the owner of `planningSession`. Planning, Analysis, Scenario Lab, and RailSaathi consume the same `session.plan`. A recovered result is not active until adoption. Adoption must create a complete plan response with fresh analysis/diagnostics and plan identity on the backend, then replace `session.plan` atomically while retaining the previous plan only for visual comparison.

### Deterministic operational diagnostics

Planning responses add a bounded `operational_diagnostics` object derived from the same normalized tasks, occupancy, candidate windows, feasibility rules, pair checks, and chosen blocks used by optimization:

- `task_priorities`: transparent source fields and categorical priority; no fake ML score.
- `conflicts`: task/train overlaps or safety-margin exclusions with stable IDs, section, interval, overlap/minimum-clearance facts, reason code, and severity derived from the affected task's recorded criticality.
- `candidate_windows`: usable start/end, duration, feasibility, violated reason codes, and whether the solver selected work in that window.
- `coordination_opportunities`: eligible task pairs/groups backed by compatibility checks and shared footprint.

The frontend only labels and filters these facts. It never infers a solver outcome.

### Planning hierarchy

Planning emphasizes:

1. active corridor/section and provenance;
2. operational timeline with train markers, conflicts, candidate windows, and possessions;
3. selected maintenance request with Priority & Feasibility;
4. unresolved conflicts and selected-object explanation;
5. work queue, solver action, candidate objective variants, and generic review lifecycle;
6. Advanced drawers for ML experiment, imports, exports, and technical diagnostics.

### Timeline primitives

`timeline.js` remains the single time-position/tick source. Shared presentational primitives standardize grids, operational train markers, interval density, accessible labels, tooltips, lane height, and truncation across Planning, Analysis, and Scenario Lab. Narrow intervals show a compact ID marker; full labels remain available through accessible names and tooltips. Tick spacing adapts to horizon duration.

### Scenario workflow

The default event must visibly change the default plan. Scenario Lab shows event → invalidated conflict → recovered changes → consequences. “Adopt Recovered Plan” calls a backend adoption endpoint that returns a complete registered plan response. A confirmation summarizes shifted/cancelled work and states that Planning, Analysis, and RailSaathi now use the adopted plan.

### RailSaathi

The existing conversational-default routing remains. Selected task, block, conflict, candidate window, and recovery facts are bounded context. Contextual prompt chips are secondary affordances; Gemini explains verified outcomes but never classifies arbitrary text into a solver action or fabricates a result.

## Visual system

Both modes use the same semantic roles: page, primary/secondary/elevated/subtle surfaces; primary/secondary/muted text; primary/subtle borders; accent; success; warning; danger; info; selected and focus states. Day mode is bright and deliberate rather than white-on-white. Night mode uses black/near-black foundations with controlled neutral elevation, not blanket navy. Status colors communicate state rather than decoration.

Landing uses a persistent SVG/HTML corridor schematic with five states: Train Traffic, Maintenance Demand, Conflict, CP-SAT Windows, Coordinated Plan. Planning stays dense and operational; Analysis stays restrained and evidentiary; Scenario Lab reads as incident → diagnosis → recovery → adoption.

## Scope and sequencing

1. **Stability:** semantic theme base, shared timeline presentation, copy/control cleanup, meaningful default scenario, complete recovery adoption.
2. **Operational intelligence:** expose deterministic diagnostics, Priority & Feasibility, visible conflicts/candidate windows/coordination, review lifecycle and objective variants, contextual RailSaathi.
3. **Reference-led transformation:** create `docs/UI_REFERENCE_AUDIT.md`, then upgrade Landing and workspace hierarchy using only mechanisms that improve comprehension.
4. **Hardening:** both themes, responsive laptop layouts, empty/loading/error/focus states, full tests, build, console scan, repository claims audit, and a reliable three-minute demo path.

Candidate plans remain the two genuine variants already supported (non-integrated comparison and coordinated RailSync plan) unless further solver objectives can be added without risking correctness. Multi-horizon views remain aggregate rolling views for Weekly and Monthly; RailSync will not imply minute-level month-long CP-SAT scheduling.

## Testing strategy

- Backend unit/API tests prove diagnostic facts use real inputs and constraints.
- Recovery tests prove the default event changes the plan and adoption returns a coherent registered plan with recalculated analysis.
- Frontend component tests prove shared state propagation, meaningful controls, contextual selection, labels, and no stale analysis.
- Geometry utility tests cover adaptive ticks, clipping-safe labels, and consistent time positioning.
- Theme tests cover semantic token availability and prohibit known literal-surface regressions.
- Every phase ends with focused tests, full backend tests, frontend tests, lint, production build, `git diff --check`, and browser verification in Day and Night modes.

## Explicit deferrals

No live railway feed, geographic map, WebGL scene, authentication, official approval bureaucracy, fake prediction model, invented railway forms/rules, or nondeterministic optimizer behavior will be added. All judge-facing claims must be traceable to current registered inputs or solver outputs.
