import { ChatHeader } from "@/components/ChatHeader";
import { useState } from "react";
import { AgentSelector } from "@/components/workflow/AgentSelector";
import { FunctionSelector } from "@/components/workflow/FunctionSelector";
import type { AgentTemplate } from "@/components/workflow/AgentSelector";
import type { FunctionDefinition } from "@/types/functions";
import type { Workflow, Stage as StageType, AgentNode, FunctionNode } from "@/types/workflow";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Stage = () => {
  const [workflow, setWorkflow] = useState<Workflow>({
    stages: [],
    connections: [],
  });
  const [agentSelectorOpen, setAgentSelectorOpen] = useState(false);
  const [functionSelectorOpen, setFunctionSelectorOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

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

  const handleSelectAgent = (template: AgentTemplate) => {
    if (!selectedStageId) return;
    
    const newNode: AgentNode = {
      id: `agent-${Date.now()}`,
      nodeType: "agent",
      name: template.name,
      type: template.id,
      systemPrompt: template.defaultSystemPrompt,
      userPrompt: template.defaultUserPrompt,
      tools: [],
      status: "idle",
    };

    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === selectedStageId
          ? { ...stage, nodes: [...stage.nodes, newNode] }
          : stage
      ),
    }));
    setAgentSelectorOpen(false);
  };

  const handleSelectFunction = (funcDef: FunctionDefinition) => {
    if (!selectedStageId) return;
    
    const newNode: FunctionNode = {
      id: `function-${Date.now()}`,
      nodeType: "function",
      name: funcDef.name,
      functionType: funcDef.id,
      config: {},
      outputPorts: funcDef.outputs,
      status: "idle",
    };

    setWorkflow((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === selectedStageId
          ? { ...stage, nodes: [...stage.nodes, newNode] }
          : stage
      ),
    }));
    setFunctionSelectorOpen(false);
  };

  const openAgentSelector = (stageId: string) => {
    setSelectedStageId(stageId);
    setAgentSelectorOpen(true);
  };

  const openFunctionSelector = (stageId: string) => {
    setSelectedStageId(stageId);
    setFunctionSelectorOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Workflow Builder</h1>
              <p className="text-muted-foreground mt-1">Create multi-stage AI workflows</p>
            </div>
            <Button onClick={addStage}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </div>

          {workflow.stages.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">No stages yet</p>
              <Button onClick={addStage}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Stage
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {workflow.stages.map((stage, index) => (
                <div key={stage.id} className="border rounded-lg p-6 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {stage.name}
                    </h3>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openAgentSelector(stage.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agent
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openFunctionSelector(stage.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Function
                      </Button>
                    </div>
                  </div>

                  {stage.nodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No nodes in this stage
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {stage.nodes.map((node) => (
                        <div key={node.id} className="border rounded p-3 bg-background">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{node.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{node.nodeType}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              node.status === 'complete' ? 'bg-green-500/10 text-green-500' :
                              node.status === 'running' ? 'bg-blue-500/10 text-blue-500' :
                              node.status === 'error' ? 'bg-red-500/10 text-red-500' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {node.status || 'idle'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AgentSelector
        open={agentSelectorOpen}
        onOpenChange={setAgentSelectorOpen}
        onSelectAgent={handleSelectAgent}
      />

      <FunctionSelector
        open={functionSelectorOpen}
        onOpenChange={setFunctionSelectorOpen}
        onSelectFunction={handleSelectFunction}
      />
    </div>
  );
};

export default Stage;
