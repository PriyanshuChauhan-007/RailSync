import { useState } from "react";
import AnalysisPage from "./pages/AnalysisPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import PlanningWorkspace from "./pages/PlanningWorkspace.jsx";
import ScenarioLab from "./pages/ScenarioLab.jsx";
import RailSaathi from "./components/assistant/RailSaathi.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import { SimulationTimeProvider } from "./context/SimulationTimeContext.jsx";
import "./rescue.css";

const defaultTerritoryData = {
  territory_id: "delhi_agra",
  display_name: "[NR] Northern HDN (New Delhi–Agra Cantt)",
  planning_horizon: {
    start_time: "2026-09-10T00:00:00Z",
    end_time: "2026-09-10T12:30:00Z"
  },
  stations: [
    { station_id: "NDLS", station_name: "New Delhi", km: 0, order: 1 },
    { station_id: "NZM", station_name: "Hazrat Nizamuddin", km: 7.5, order: 2 },
    { station_id: "OKA", station_name: "Okhla", km: 11.2, order: 3 },
    { station_id: "TKD", station_name: "Tughlakabad", km: 14.8, order: 4 },
    { station_id: "FDB", station_name: "Faridabad", km: 29.1, order: 5 },
    { station_id: "PWL", station_name: "Palwal", km: 59.6, order: 6 },
    { station_id: "AGC", station_name: "Agra Cantt", km: 195, order: 7 }
  ],
  sections: [
    { section_id: "NR_SEC01", from_station: "NZM", to_station: "OKA", capacity_mode: "EXPLICIT_DIRECTIONAL_TRACKS" },
    { section_id: "NR_SEC02", from_station: "OKA", to_station: "TKD", capacity_mode: "EXPLICIT_DIRECTIONAL_TRACKS" },
    { section_id: "NR_SEC03", from_station: "TKD", to_station: "FDB", capacity_mode: "EXPLICIT_DIRECTIONAL_TRACKS" },
    { section_id: "NR_SEC04", from_station: "FDB", to_station: "PWL", capacity_mode: "EXPLICIT_DIRECTIONAL_TRACKS" }
  ]
};

const defaultTasksData = [
  { task_id: "TSK_01", section_id: "NR_SEC01", department: "ENGINEERING", task_type: "Rail Fracture / Weld Repair", duration_minutes: 90, criticality: 9 },
  { task_id: "TSK_02", section_id: "NR_SEC02", department: "S&T", task_type: "Axle Counter Maintenance", duration_minutes: 45, criticality: 7 },
  { task_id: "TSK_03", section_id: "NR_SEC03", department: "TRD", task_type: "OHE Catenary Adjustment", duration_minutes: 60, criticality: 8 }
];

const defaultTrainsData = [
  { train_id: "12050", name: "Gatimaan Express", speed: 160, section_id: "NR_SEC01", entry_time: "2026-09-10T06:00:00Z", exit_time: "2026-09-10T06:30:00Z" },
  { train_id: "12002", name: "Bhopal Shatabdi", speed: 150, section_id: "NR_SEC02", entry_time: "2026-09-10T06:15:00Z", exit_time: "2026-09-10T06:45:00Z" }
];

const defaultPlanData = {
  plan_identity: { plan_id: "PLAN_DEF_01", parent_plan_id: null },
  blocks: [
    { block_id: "BLK_01", section_id: "NR_SEC01", start_time: "2026-09-10T08:00:00Z", end_time: "2026-09-10T09:30:00Z", tasks: ["TSK_01"], integrated: true, status: "APPROVED" },
    { block_id: "BLK_02", section_id: "NR_SEC02", start_time: "2026-09-10T10:00:00Z", end_time: "2026-09-10T11:00:00Z", tasks: ["TSK_02"], integrated: false, status: "APPROVED" }
  ],
  unscheduled_tasks: [],
  risk: { score: 12, level: "LOW" },
  metrics: {
    integrated_blocks: 1,
    scheduled_task_count: 2,
    block_count: 2,
  },
  operational_diagnostics: { candidate_windows: [], conflicts: [] }
};

function App() {
  const [view, setView] = useState("landing");
  const [workspaceView, setWorkspaceView] = useState("planning");
  const [planningSession, setPlanningSession] = useState({
    territoryId: "delhi_agra",
    territory: defaultTerritoryData,
    tasks: defaultTasksData,
    trains: defaultTrainsData,
    plan: defaultPlanData,
    selectedTaskId: "TSK_01",
    selectedBlockId: "BLK_01",
    assistantPreview: null,
    dataError: null,
    optimizationError: null,
    recovery: null,
    riskConfig: { mode: "STATIC", target: "", profile: "" },
  });

  let pageContent;
  if (view === "workspace") {
    if (workspaceView === "scenario") {
      pageContent = (
        <ScenarioLab
          session={planningSession}
          setSession={setPlanningSession}
          onNavigate={setWorkspaceView}
          onHome={() => setView("landing")}
        />
      );
    } else if (workspaceView === "analysis") {
      pageContent = (
        <AnalysisPage
          session={planningSession}
          onNavigate={setWorkspaceView}
          onHome={() => setView("landing")}
        />
      );
    } else {
      pageContent = (
        <PlanningWorkspace
          session={planningSession}
          setSession={setPlanningSession}
          onNavigate={setWorkspaceView}
          onHome={() => setView("landing")}
        />
      );
    }
  } else {
    pageContent = (
      <LandingPage
        initialTerritoryId={planningSession.territoryId}
        onLaunchPlanner={(territoryId = planningSession.territoryId) => {
          if (territoryId !== planningSession.territoryId) {
            setPlanningSession((current) => ({
              ...current,
              territoryId,
              territory: null,
              tasks: [],
              trains: [],
              plan: null,
              recovery: null,
              dataError: null,
              optimizationError: null,
              selectedTaskId: null,
              selectedBlockId: null,
              assistantPreview: null,
            }));
          }
          setWorkspaceView("planning");
          setView("workspace");
        }}
      />
    );
  }

  return (
    <SimulationTimeProvider>
      <div className="railsaathi-workspace">
        <ErrorBoundary onReset={() => {
          setPlanningSession((current) => ({
            ...current,
            territory: defaultTerritoryData,
            tasks: defaultTasksData,
            trains: defaultTrainsData,
            plan: defaultPlanData,
          }));
          setWorkspaceView("planning");
          setView("workspace");
        }}>
          {pageContent}
        </ErrorBoundary>
        <RailSaathi
          territoryId={planningSession.territoryId}
          territory={planningSession.territory}
          plan={planningSession.plan}
          selectedBlock={planningSession.plan?.blocks?.find(
            (block) => block.block_id === planningSession.selectedBlockId
          )}
          selectedTask={(planningSession.tasks || []).find(
            (task) => task.task_id === planningSession.selectedTaskId
          )}
          onPreview={(preview) =>
            setPlanningSession((current) => ({
              ...current,
              assistantPreview: preview,
            }))
          }
          onOpenPlanning={() => {
            setWorkspaceView("planning");
            setView("workspace");
          }}
        />
      </div>
    </SimulationTimeProvider>
  );
}

export default App;
