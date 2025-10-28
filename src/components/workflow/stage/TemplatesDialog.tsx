import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Workflow, FunctionNode, AgentNode } from "@/types/workflow";

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (template: Workflow) => void;
}

const STAGE_TEMPLATES: Record<string, { name: string; description: string; category: string; workflow: Workflow }> = {
  'audio-transcription-analysis': {
    name: 'Audio Transcription & Analysis',
    description: 'Upload audio files, transcribe automatically, and generate comprehensive project documentation',
    category: 'transcripts',
    workflow: {
      stages: [
        {
          id: 'stage-1',
          name: 'Audio Input & Transcription',
          nodes: [
            {
              id: 'node-1',
              nodeType: 'function',
              functionType: 'content',
              name: 'Audio Transcription',
              config: {},
              outputPorts: ['output']
            } as FunctionNode
          ]
        },
        {
          id: 'stage-2',
          name: 'Requirements Generation',
          nodes: [
            {
              id: 'node-2',
              nodeType: 'agent',
              type: 'technical-requirements',
              name: 'Technical Requirements Generator',
              systemPrompt: 'Develops a comprehensive set of technical requirements based on meeting discussions and decisions. Analyzes the transcript for feature requests, technical constraints, dependencies, and system requirements.',
              userPrompt: '{{input}}',
              tools: []
            } as AgentNode,
            {
              id: 'node-3',
              nodeType: 'agent',
              type: 'business-requirements',
              name: 'Business Requirements Generator',
              systemPrompt: 'Analyzes the transcript and generates formal business requirements. Extracts business objectives, stakeholder needs, success criteria, and functional requirements in a structured format.',
              userPrompt: '{{input}}',
              tools: []
            } as AgentNode
          ]
        },
        {
          id: 'stage-3',
          name: 'Script Creation',
          nodes: [
            {
              id: 'node-4',
              nodeType: 'agent',
              type: 'engagement-script',
              name: 'Engagement Script Creator',
              systemPrompt: 'Crafts an engaging script for stakeholder presentations based on requirements. Creates compelling narratives that communicate technical concepts to non-technical audiences with clear benefits and implementation plans.',
              userPrompt: '{{input}}',
              tools: []
            } as AgentNode
          ]
        },
        {
          id: 'stage-4',
          name: 'Document Consolidation',
          nodes: [
            {
              id: 'node-5',
              nodeType: 'agent',
              type: 'consolidator',
              name: 'Document Consolidator',
              systemPrompt: 'Combines all generated requirements, technical specs, and engagement materials into a comprehensive project document. Ensures consistency, removes redundancies, and creates a professional final deliverable.',
              userPrompt: '{{input}}',
              tools: []
            } as AgentNode
          ]
        }
      ],
      connections: [
        { id: 'conn-1', fromNodeId: 'node-1', toNodeId: 'node-2' },
        { id: 'conn-2', fromNodeId: 'node-1', toNodeId: 'node-3' },
        { id: 'conn-3', fromNodeId: 'node-2', toNodeId: 'node-4' },
        { id: 'conn-4', fromNodeId: 'node-3', toNodeId: 'node-4' },
        { id: 'conn-5', fromNodeId: 'node-4', toNodeId: 'node-5' }
      ]
    }
  },
  'meeting-summary': {
    name: 'Meeting Summary Generator',
    description: 'Upload meeting transcripts and generate comprehensive summaries with action items',
    category: 'transcripts',
    workflow: {
      stages: [
        {
          id: 'stage-1',
          name: 'Input',
          nodes: [
            {
              id: 'node-1',
              nodeType: 'function',
              functionType: 'content',
              name: 'Meeting Transcript',
              config: {},
              outputPorts: ['output']
            } as FunctionNode
          ]
        },
        {
          id: 'stage-2',
          name: 'Analysis',
          nodes: [
            {
              id: 'node-2',
              nodeType: 'agent',
              type: 'key-points',
              name: 'Key Points Extractor',
              systemPrompt: 'Extract the most important discussion points from this meeting transcript. Group by topic and be concise. Focus on decisions made and key takeaways.',
              userPrompt: '{{input}}',
              tools: []
            } as AgentNode,
            {
              id: 'node-3',
              nodeType: 'agent',
              type: 'action-items',
              name: 'Action Items Parser',
              systemPrompt: 'Identify all action items and tasks from the transcript. For each, extract: 1) Task description, 2) Person assigned (if mentioned), 3) Deadline (if mentioned), 4) Dependencies. Format as a numbered list.',
              userPrompt: '{{input}}',
              tools: []
            } as AgentNode
          ]
        },
        {
          id: 'stage-3',
          name: 'Summary',
          nodes: [
            {
              id: 'node-4',
              nodeType: 'agent',
              type: 'email-writer',
              name: 'Professional Email Writer',
              systemPrompt: 'Draft a professional follow-up email. Include: 1) Brief meeting recap, 2) Key decisions made, 3) Action items table with owners and deadlines, 4) Next meeting info if applicable. Use professional government communication style.',
              userPrompt: '{{input}}',
              tools: []
            } as AgentNode
          ]
        }
      ],
      connections: [
        { id: 'conn-1', fromNodeId: 'node-1', toNodeId: 'node-2' },
        { id: 'conn-2', fromNodeId: 'node-1', toNodeId: 'node-3' },
        { id: 'conn-3', fromNodeId: 'node-2', toNodeId: 'node-4' },
        { id: 'conn-4', fromNodeId: 'node-3', toNodeId: 'node-4' }
      ]
    }
  }
};

export const TemplatesDialog = ({ open, onOpenChange, onLoad }: TemplatesDialogProps) => {
  const templates = Object.entries(STAGE_TEMPLATES);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Workflow Templates</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[600px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(([key, template]) => (
              <Card key={key} className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      {template.workflow.stages.length} stages
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        onLoad(template.workflow);
                        onOpenChange(false);
                      }}
                    >
                      Use Template
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
