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
        {pageContent}
        <RailSaathi
          territoryId={planningSession.territoryId}
          territory={planningSession.territory}
          plan={planningSession.plan}
          selectedBlock={planningSession.plan?.blocks.find(
            (block) => block.block_id === planningSession.selectedBlockId
          )}
          selectedTask={planningSession.tasks.find(
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
