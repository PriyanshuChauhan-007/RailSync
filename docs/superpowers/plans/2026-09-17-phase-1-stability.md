# RailSync Phase 1 Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove judge-facing trust breaks before deeper operational intelligence or visual transformation.

**Architecture:** Keep `App.jsx` as the shared-session owner and CP-SAT as scheduling authority. Fix recovery adoption at the backend contract boundary, consolidate presentational timeline primitives without changing solver geometry, and migrate visible surfaces to semantic theme tokens incrementally.

**Tech Stack:** Python 3/FastAPI/Pydantic/OR-Tools, React 19, Vitest/Testing Library, CSS, Vite.

**Spec:** `docs/superpowers/specs/2026-09-17-sih-finalization-design.md`

## Global Constraints

- Do not change CP-SAT scheduling objectives or hard constraints in this phase.
- Do not fabricate railway rules, timings, conflicts, metrics, or official workflow.
- Keep Day and Night modes first-class.
- Do not expose Gemini credentials or make live provider calls in tests.
- Preserve existing uncommitted RailSaathi routing behavior.

---

### Task 1: Checkpoint the completed RailSaathi routing fix

**Files:**
- Modify: none
- Verify: `backend/test_copilot.py`, `frontend/test/railsaathi.test.jsx`

**Interfaces:**
- Consumes: existing dirty working-tree changes
- Produces: an isolated, reviewable checkpoint before unrelated finalization changes

- [ ] **Step 1: Verify only the intended four files are modified**

Run: `git status --short` and `git diff --stat`

Expected: only `backend/copilot_service.py`, `backend/test_copilot.py`, `frontend/src/components/assistant/RailSaathi.jsx`, and `frontend/test/railsaathi.test.jsx`, plus the newly authored planning documents.

- [ ] **Step 2: Re-run focused routing tests**

Run: `.venv\Scripts\python.exe -m pytest backend/test_copilot.py -q -p no:cacheprovider`

Expected: PASS with no live Gemini call.

- [ ] **Step 3: Commit the routing checkpoint separately from the finalization documents**

```powershell
git add backend/copilot_service.py backend/test_copilot.py frontend/src/components/assistant/RailSaathi.jsx frontend/test/railsaathi.test.jsx
git commit -m "fix: route free-form RailSaathi messages conversationally"
```

### Task 2: Make the default recovery scenario visibly meaningful

**Files:**
- Modify: `frontend/src/pages/ScenarioLab.jsx`
- Test: `frontend/test/planningSelection.test.jsx`

**Interfaces:**
- Consumes: `session.trains`, `session.plan`, and real recovery endpoint
- Produces: a deterministic default `TRAIN_DELAY` selection that invalidates the default Eastern demo plan

- [ ] **Step 1: Write a failing component test**

Add a test that renders Scenario Lab with the real-shaped default session, asserts train `37814` and delay `25` are selected for `saktigarh_memari_public_demo`, submits the scenario, and verifies the recovery request uses those values.

- [ ] **Step 2: Run the focused test and confirm it fails because `37786` is selected**

Run: `npm test -- --run frontend/test/planningSelection.test.jsx`

Expected: FAIL showing the current first-train default.

- [ ] **Step 3: Implement minimal deterministic default selection**

In `ScenarioLab.jsx`, prefer train `37814` only when it exists in the registered default territory; otherwise preserve the first available train. Keep the user-selectable control unchanged.

- [ ] **Step 4: Verify focused test passes**

Run: `npx vitest run test/planningSelection.test.jsx`

Expected: PASS.

### Task 3: Adopt a recovered plan as a complete plan version

**Files:**
- Modify: `backend/recovery_service.py`
- Modify: `backend/main.py`
- Modify: `backend/schemas.py`
- Modify: `frontend/src/services/api.js`
- Modify: `frontend/src/pages/ScenarioLab.jsx`
- Test: `backend/test_recovery_api.py`
- Test: `frontend/test/planningSelection.test.jsx`

**Interfaces:**
- Consumes: territory ID, base plan identity, recovered solver result, disruption and recovery diagnostics
- Produces: `POST /api/recovery/adopt` returning the same complete plan shape as `/api/optimize`, with a new identity and recalculated analysis

- [ ] **Step 1: Write failing backend tests**

Add tests that recover the default plan, adopt it, and assert:

```python
assert adopted["plan_identity"]["parent_plan_id"] == base["plan_identity"]["plan_id"]
assert adopted["blocks"] == recovery["recovered_plan"]["blocks"]
assert adopted["analysis"]["railsync"]["blocks"] == adopted["blocks"]
assert adopted["analysis"] != base["analysis"]
```

Also assert invalid/replayed adoption payloads are rejected rather than silently rebuilding from arbitrary frontend data.

- [ ] **Step 2: Run the backend test and verify the endpoint is missing**

Run: `.venv\Scripts\python.exe -m pytest backend/test_recovery_api.py -q -p no:cacheprovider`

Expected: FAIL with HTTP 404 for `/api/recovery/adopt`.

- [ ] **Step 3: Implement backend adoption**

Refactor the existing planning response assembly so recovery can build a complete registered plan from solver diagnostics without re-solving or trusting frontend-computed analysis. Register the adopted result with the base plan ID as parent and include recovery provenance.

- [ ] **Step 4: Write and run the failing frontend adoption test**

Mock `adoptRecoveredPlan` to return a complete adopted plan. Assert clicking “Adopt Recovered Plan” replaces `session.plan`, stores the former plan in `previousPlan`, clears recovery, and displays a summary confirmation.

- [ ] **Step 5: Implement the frontend adoption call**

Replace the partial object spread in `ScenarioLab.jsx` with the adoption API response. Copy should read “Adopt Recovered Plan.” Confirmation should use returned recovery metrics, for example `2 possessions retimed · 0 cancelled`, without hardcoded values.

- [ ] **Step 6: Verify both focused suites pass**

Run backend recovery API tests and `npx vitest run test/planningSelection.test.jsx`.

### Task 4: Consolidate semantic theme tokens

**Files:**
- Modify: `frontend/src/theme/theme.css`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.css`
- Modify: `frontend/src/pages/planner/planner.css`
- Modify: `frontend/src/pages/analysis/analysis.css`
- Modify: `frontend/src/pages/scenario/scenario.css`
- Modify: `frontend/src/rescue.css`
- Test: `frontend/test/theme.test.jsx`

**Interfaces:**
- Consumes: `data-theme="light|dark"`
- Produces: semantic tokens `--page-bg`, `--surface-primary`, `--surface-secondary`, `--surface-elevated`, `--surface-subtle`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-primary`, `--border-subtle`, `--accent`, `--accent-muted`, `--success`, `--warning`, `--danger`, and `--info`

- [ ] **Step 1: Extend the theme regression test**

Read `theme.css` and assert every required semantic token exists in both theme scopes. Assert known primary workspace surfaces use semantic variables and do not depend on `#fff`, `#ffffff`, or the old blanket dark-selector repair.

- [ ] **Step 2: Run the theme test and confirm it fails on missing semantic roles**

Run: `npx vitest run test/theme.test.jsx`

Expected: FAIL for missing token names.

- [ ] **Step 3: Add semantic tokens and compatibility aliases**

Define the roles once per theme, then map legacy aliases such as `--background`, `--surface`, `--text`, and `--border` to the semantic roles so untouched components remain stable.

- [ ] **Step 4: Replace literal primary surfaces incrementally**

Update only visible Landing/Planning/Analysis/Scenario surfaces encountered in the audit. Remove selectors from the blanket Night-mode override once their component CSS uses semantic tokens directly.

- [ ] **Step 5: Run theme tests, lint, and build**

Expected: PASS; both modes retain readable status colors.

### Task 5: Replace decorative train images and standardize timeline presentation

**Files:**
- Create: `frontend/src/components/timeline/TimelinePrimitives.jsx`
- Create: `frontend/src/components/timeline/timeline.css`
- Modify: `frontend/src/utils/timeline.js`
- Modify: `frontend/src/components/planning/MaintenanceTimeline.jsx`
- Modify: `frontend/src/components/analysis/PairedPossessionTimeline.jsx`
- Modify: `frontend/src/components/planning/RecoveryTimeline.jsx`
- Test: `frontend/test/timeDistance.test.jsx`
- Test: `frontend/test/planningSelection.test.jsx`

**Interfaces:**
- Produces: `TimelineGrid({ticks})`, `OperationalTrainMarker({train, territory, compact})`, `intervalDensity(start,end,horizon)`, and adaptive `buildTicks(horizon)`

- [ ] **Step 1: Write failing utility/component tests**

Test that long horizons choose readable tick counts, short horizons retain boundary labels, train markers render canonical service number/direction only when present, and no timeline component renders `rail-train-top-view.png`.

- [ ] **Step 2: Run focused tests and verify failure on duplicated PNG markup/current ticks**

Run: `npx vitest run test/timeDistance.test.jsx test/planningSelection.test.jsx`

- [ ] **Step 3: Implement shared primitives**

Move duplicated grid and operational marker presentation into `components/timeline`. Preserve `rangeStyle` as the sole one-dimensional time-position function. Use compact IDs in narrow bars and full accessible names/tooltips.

- [ ] **Step 4: Fix interval label geometry**

Use consistent lane heights, centered flex layout, `overflow: hidden`, and whole-label truncation. Do not draw text inside intervals below the tested minimum width; retain it in `title`/`aria-label`.

- [ ] **Step 5: Verify focused tests, lint, and build**

Expected: no train PNG in the production bundle and no overlapping baseline labels at the default laptop viewport.

### Task 6: Copy and control cleanup

**Files:**
- Modify: `frontend/src/components/planning/OperationalPanels.jsx`
- Modify: `frontend/src/pages/AnalysisPage.jsx`
- Modify: `docs/REOPTIMIZATION.md`
- Test: `frontend/test/planningSelection.test.jsx`

**Interfaces:**
- Consumes: current real operational endpoints
- Produces: accurate judge-facing labels without removing working advanced functions

- [ ] **Step 1: Write failing visible-copy assertions**

Cover singular/plural timetable source wording, one visible Analysis question, “Adopt Recovered Plan,” and imports nested under `Advanced · Data inputs`.

- [ ] **Step 2: Run tests and confirm failures on current copy**

- [ ] **Step 3: Implement copy/hierarchy changes**

Keep imports and ML experiments functional but collapsed under Advanced. Keep lifecycle actions truthful and generic. Remove duplicated question text by making the page H1 the only occurrence and using a methodology heading inside the comparison card.

- [ ] **Step 4: Run Phase 1 verification**

Run:

```powershell
.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider --tb=short
Set-Location frontend
npm test
npm run lint
npm run build
Set-Location ..
git diff --check
```

Manually verify Landing, Planning, Analysis, Scenario Lab, and RailSaathi in Day and Night at a common laptop viewport. Confirm the default recovery visibly changes at least one possession and adopted state propagates to Planning, Analysis, and RailSaathi.

- [ ] **Step 5: Commit Phase 1**

```powershell
git add backend frontend docs
git commit -m "fix: stabilize shared planning and recovery experience"
```
