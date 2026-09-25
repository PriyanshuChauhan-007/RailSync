import { useState } from "react";
import AnalysisPage from "./pages/AnalysisPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import PlanningWorkspace from "./pages/PlanningWorkspace.jsx";
import ScenarioLab from "./pages/ScenarioLab.jsx";
import RailSaathi from "./components/assistant/RailSaathi.jsx";
import { SimulationTimeProvider } from "./context/SimulationTimeContext.jsx";
import "./rescue.css";

function App() {
  const [view, setView] = useState("landing");
  const [workspaceView, setWorkspaceView] = useState("planning");
  const [planningSession, setPlanningSession] = useState({
    territoryId: "delhi_agra",
    territory: null,
    tasks: [],
    trains: [],
    plan: null,
    selectedTaskId: null,
    selectedBlockId: null,
    assistantPreview: null,
    dataError: null,
    optimizationError: null,
    recovery: null,
    riskConfig: { mode: "STATIC", target: "", profile: "" },
  });

  let content;
  if (view === "workspace") {
    let page;
    if (workspaceView === "scenario") {
      page = <ScenarioLab session={planningSession} setSession={setPlanningSession}
        onNavigate={setWorkspaceView} onHome={() => setView("landing")} />;
    } else if (workspaceView === "analysis") {
      page = (
        <AnalysisPage
          session={planningSession}
          onNavigate={setWorkspaceView}
          onHome={() => setView("landing")}
        />
      );
    } else {
      page = (
      <PlanningWorkspace
        session={planningSession}
        setSession={setPlanningSession}
        onNavigate={setWorkspaceView}
        onHome={() => setView("landing")}
      />
      );
    }
    content = (
      <div className="railsaathi-workspace">{page}
        <RailSaathi
          territoryId={planningSession.territoryId} territory={planningSession.territory}
          plan={planningSession.plan}
          selectedBlock={planningSession.plan?.blocks.find((block) => block.block_id === planningSession.selectedBlockId)}
          selectedTask={planningSession.tasks.find((task) => task.task_id === planningSession.selectedTaskId)}
          onPreview={(preview) => setPlanningSession((current) => ({ ...current, assistantPreview: preview }))}
          onOpenPlanning={() => setWorkspaceView("planning")}
        />
      </div>
    );
  } else {
    content = (
      <LandingPage
        initialTerritoryId={planningSession.territoryId}
        onLaunchPlanner={(territoryId = planningSession.territoryId) => {
          if (territoryId !== planningSession.territoryId) {
            setPlanningSession((current) => ({
              ...current, territoryId, territory: null, tasks: [], trains: [], plan: null,
              recovery: null, dataError: null, optimizationError: null,
              selectedTaskId: null, selectedBlockId: null, assistantPreview: null,
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
      {content}
    </SimulationTimeProvider>
  );
}

export default App;
