import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Workflow, GitBranch, Library, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type ActionType = 'canvas' | 'stage' | 'prompt-library';

interface WorkflowSuggestionProps {
  actionType: ActionType;
  workflowData?: any;
  description: string;
}

export const WorkflowSuggestion = ({ actionType, workflowData, description }: WorkflowSuggestionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [editedWorkflow, setEditedWorkflow] = useState(JSON.stringify(workflowData, null, 2));
  const navigate = useNavigate();

  if (isDismissed) return null;

  const getIcon = () => {
    switch (actionType) {
      case 'canvas':
        return <Workflow className="w-5 h-5" />;
      case 'stage':
        return <GitBranch className="w-5 h-5" />;
      case 'prompt-library':
        return <Library className="w-5 h-5" />;
    }
  };

  const getTitle = () => {
    switch (actionType) {
      case 'canvas':
        return 'Create Canvas Workflow';
      case 'stage':
        return 'Create Stage Workflow';
      case 'prompt-library':
        return 'View Prompt Library';
    }
  };

  const handleAccept = () => {
    if (actionType === 'prompt-library') {
      navigate('/prompts');
      return;
    }

    try {
      const workflow = isEditing ? JSON.parse(editedWorkflow) : workflowData;
      
      if (actionType === 'canvas') {
        navigate('/canvas', { state: { importedWorkflow: workflow } });
      } else if (actionType === 'stage') {
        navigate('/stage', { state: { importedWorkflow: workflow } });
      }
    } catch (error) {
      console.error('Invalid workflow JSON:', error);
      // Stay in editing mode if there's an error
    }
  };

  const handleDecline = () => {
    setIsDismissed(true);
  };

  return (
    <Card className="p-4 bg-accent/5 border-accent/20">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">{getTitle()}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {isEditing && actionType !== 'prompt-library' && (
        <div className="mb-3">
          <Textarea
            value={editedWorkflow}
            onChange={(e) => setEditedWorkflow(e.target.value)}
            className="font-mono text-xs min-h-[200px]"
            placeholder="Edit workflow JSON..."
          />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleAccept}
          size="sm"
          className="gap-2"
        >
          {actionType === 'prompt-library' ? 'Open Library' : 'Yes, Create'}
          <ChevronRight className="w-4 h-4" />
        </Button>
        
        {actionType !== 'prompt-library' && !isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
          >
            Edit Workflow
          </Button>
        )}
        
        {isEditing && (
          <Button
            onClick={() => setIsEditing(false)}
            variant="outline"
            size="sm"
          >
            Cancel Edit
          </Button>
        )}
        
        <Button
          onClick={handleDecline}
          variant="ghost"
          size="sm"
        >
          No, Thanks
        </Button>
      </div>
    </Card>
  );
};
