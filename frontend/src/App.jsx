import { useEffect, useState } from "react";
import AnalysisPage from "./pages/AnalysisPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import PlanningWorkspace from "./pages/PlanningWorkspace.jsx";
import ScenarioLab from "./pages/ScenarioLab.jsx";
import RailSaathi from "./components/assistant/RailSaathi.jsx";
import "./rescue.css";

function App() {
  const [activeCorridorId, setActiveCorridorId] = useState("delhi_agra");
  const [view, setView] = useState("landing");
  const [workspaceView, setWorkspaceView] = useState("planning");
  const [planningSession, setPlanningSession] = useState({
    activeCorridorId: "delhi_agra",
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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [view, workspaceView]);

  let content;
  if (view === "workspace") {
    if (workspaceView === "scenario") {
      content = <ScenarioLab session={planningSession} setSession={setPlanningSession}
        onNavigate={setWorkspaceView} onHome={() => setView("landing")} />;
    } else if (workspaceView === "analysis") {
      content = (
        <AnalysisPage
          session={planningSession}
          onNavigate={setWorkspaceView}
          onHome={() => setView("landing")}
        />
      );
    } else {
      content = (
        <PlanningWorkspace
          session={planningSession}
          setSession={setPlanningSession}
          onNavigate={setWorkspaceView}
          onHome={() => setView("landing")}
        />
      );
    }
  } else {
    content = (
      <LandingPage
        initialTerritoryId={planningSession.territoryId ?? activeCorridorId}
        onLaunchPlanner={(targetTerritoryId) => {
          const safeTerritoryId = (typeof targetTerritoryId === "string" && targetTerritoryId.trim() && targetTerritoryId !== "[object Object]")
            ? targetTerritoryId.trim()
            : (planningSession.territoryId ?? activeCorridorId ?? "delhi_agra");
          setActiveCorridorId(safeTerritoryId);
          if (safeTerritoryId !== planningSession.territoryId || !planningSession.territory) {
            setPlanningSession((current) => ({
              ...current,
              activeCorridorId: safeTerritoryId,
              territoryId: safeTerritoryId,
              territory: safeTerritoryId === current.territoryId ? current.territory : null,
              tasks: safeTerritoryId === current.territoryId ? current.tasks : [],
              trains: safeTerritoryId === current.territoryId ? current.trains : [],
              plan: safeTerritoryId === current.territoryId ? current.plan : null,
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
    <div className="railsaathi-workspace">
      {content}
      <RailSaathi
        territoryId={planningSession.territoryId}
        territory={planningSession.territory}
        plan={planningSession.plan}
        selectedBlock={planningSession.plan?.blocks?.find((block) => block.block_id === planningSession.selectedBlockId)}
        selectedTask={planningSession.tasks?.find((task) => task.task_id === planningSession.selectedTaskId)}
        onPreview={(preview) => setPlanningSession((current) => ({ ...current, assistantPreview: preview }))}
        onOpenPlanning={() => {
          setWorkspaceView("planning");
          setView("workspace");
        }}
      />
    </div>
  );
}

export default App;
