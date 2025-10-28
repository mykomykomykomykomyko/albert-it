import { ActionType } from '@/components/chat/WorkflowSuggestion';

export interface WorkflowSuggestionData {
  type: ActionType;
  description: string;
  workflow?: any;
}

export function parseWorkflowSuggestion(content: string): {
  cleanContent: string;
  suggestion: WorkflowSuggestionData | null;
} {
  const suggestionRegex = /\[WORKFLOW_SUGGESTION\]([\s\S]*?)\[\/WORKFLOW_SUGGESTION\]/;
  const match = content.match(suggestionRegex);

  if (!match) {
    return { cleanContent: content, suggestion: null };
  }

  const suggestionBlock = match[1];
  const cleanContent = content.replace(match[0], '').trim();

  // Parse the suggestion block
  const typeMatch = suggestionBlock.match(/type:\s*(canvas|stage|prompt-library)/);
  const descMatch = suggestionBlock.match(/description:\s*([^\n]+)/);
  const workflowMatch = suggestionBlock.match(/workflow:\s*(\{[\s\S]*\})/);

  if (!typeMatch || !descMatch) {
    return { cleanContent: content, suggestion: null };
  }

  const type = typeMatch[1] as ActionType;
  const description = descMatch[1].trim();
  let workflow = null;

  if (workflowMatch && type !== 'prompt-library') {
    try {
      workflow = JSON.parse(workflowMatch[1]);
    } catch (e) {
      console.error('Failed to parse workflow JSON:', e);
      return { cleanContent: content, suggestion: null };
    }
  }

  return {
    cleanContent,
    suggestion: { type, description, workflow }
  };
}
