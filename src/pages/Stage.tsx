import { ChatHeader } from "@/components/ChatHeader";
import { useState } from "react";
import { Toolbar } from "@/components/workflow/stage/Toolbar";
import { ResponsiveLayout } from "@/components/workflow/stage/ResponsiveLayout";
import { WorkflowCanvas } from "@/components/workflow/stage/WorkflowCanvas";
import type { Workflow, Stage as StageType, AgentNode, FunctionNode, Connection } from "@/types/workflow";
import { toast } from "sonner";

const Stage = () => {
  const [workflow, setWorkflow] = useState<Workflow>({
    stages: [],
    connections: [],
  });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const addStage = () => {
    const newStage: StageType = {
      id: `stage-${Date.now()}`,
      name: `Stage ${workflow.stages.length + 1}`,
      nodes: [],
    };
    setWorkflow((prev) => ({
      ...prev,
      stages: [...prev.stages, newStage],
    }));
  };

  const handleSave = () => {
    const json = JSON.stringify({ workflow }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workflow-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Workflow saved successfully");
  };

  const handleLoad = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.workflow) {
          setWorkflow(data.workflow);
          toast.success("Workflow loaded successfully");
        }
      } catch (error) {
        toast.error("Failed to load workflow");
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (confirm("Clear the entire workflow?")) {
      setWorkflow({ stages: [], connections: [] });
      setSelectedNode(null);
      setConnectingFrom(null);
      toast.success("Workflow cleared");
    }
  };

  const handleRun = () => {
    toast.info("Workflow execution coming soon!");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      <Toolbar
        onAddStage={addStage}
        onSave={handleSave}
        onLoad={handleLoad}
        onClear={handleClear}
        onRun={handleRun}
      />
      
      <ResponsiveLayout
        sidebar={<div className="p-4">Sidebar coming soon</div>}
        mobileCanvas={
          <WorkflowCanvas
            workflow={workflow}
            selectedNode={selectedNode}
            connectingFrom={connectingFrom}
            layoutId="mobile"
            onSelectNode={setSelectedNode}
            onAddAgent={() => {}}
            onAddNode={() => {}}
            onDeleteAgent={() => {}}
            onDeleteStage={() => {}}
            onRenameStage={() => {}}
            onReorderStages={() => {}}
            onToggleMinimize={() => {}}
            onStartConnection={setConnectingFrom}
            onCompleteConnection={() => {}}
            onDeleteConnection={() => {}}
          />
        }
        desktopCanvas={
          <WorkflowCanvas
            workflow={workflow}
            selectedNode={selectedNode}
            connectingFrom={connectingFrom}
            layoutId="desktop"
            onSelectNode={setSelectedNode}
            onAddAgent={() => {}}
            onAddNode={() => {}}
            onDeleteAgent={() => {}}
            onDeleteStage={() => {}}
            onRenameStage={() => {}}
            onReorderStages={() => {}}
            onToggleMinimize={() => {}}
            onStartConnection={setConnectingFrom}
            onCompleteConnection={() => {}}
            onDeleteConnection={() => {}}
          />
        }
        properties={<div className="p-4">Properties coming soon</div>}
        onAddStage={addStage}
        onRun={handleRun}
        onSave={handleSave}
        onLoad={handleLoad}
        onClear={handleClear}
        hasSelectedAgent={selectedNode !== null}
      />
    </div>
  );
};

export default Stage;