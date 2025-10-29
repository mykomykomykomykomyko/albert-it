import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Sparkles, X, Plus, Check } from 'lucide-react';
import { AnalysisPrompt } from '@/types/imageAnalysis';
import { generateId } from '@/lib/utils';

interface PromptManagerProps {
  prompts: AnalysisPrompt[];
  selectedPromptIds: string[];
  onPromptsChange: (prompts: AnalysisPrompt[]) => void;
  onSelectionChange: (promptIds: string[]) => void;
  onOpenAgentSelector: () => void;
  disabled?: boolean;
}

export function PromptManager({
  prompts,
  selectedPromptIds,
  onPromptsChange,
  onSelectionChange,
  onOpenAgentSelector,
  disabled = false
}: PromptManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');

  const handleCreatePrompt = () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) return;

    const newPrompt: AnalysisPrompt = {
      id: generateId(),
      name: newPromptName.trim(),
      content: newPromptContent.trim(),
      isCustom: true,
      createdAt: new Date()
    };

    onPromptsChange([...prompts, newPrompt]);
    onSelectionChange([...selectedPromptIds, newPrompt.id]);
    
    setNewPromptName('');
    setNewPromptContent('');
    setIsCreating(false);
  };

  const handleTogglePrompt = (promptId: string) => {
    if (selectedPromptIds.includes(promptId)) {
      onSelectionChange(selectedPromptIds.filter(id => id !== promptId));
    } else {
      onSelectionChange([...selectedPromptIds, promptId]);
    }
  };

  const handleDeletePrompt = (promptId: string) => {
    onPromptsChange(prompts.filter(p => p.id !== promptId));
    onSelectionChange(selectedPromptIds.filter(id => id !== promptId));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Analysis Prompts</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={onOpenAgentSelector}
              variant="outline"
              size="sm"
              disabled={disabled}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Add Agent
            </Button>
            <Button
              onClick={() => setIsCreating(!isCreating)}
              variant="outline"
              size="sm"
              disabled={disabled}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreating ? 'Cancel' : 'Custom'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedPromptIds.length} prompt{selectedPromptIds.length !== 1 ? 's' : ''} selected
        </p>
      </CardHeader>
      <CardContent>
        {isCreating && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/30 space-y-3">
            <Input
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
              placeholder="Prompt name..."
              disabled={disabled}
            />
            <Textarea
              value={newPromptContent}
              onChange={(e) => setNewPromptContent(e.target.value)}
              placeholder="Enter your prompt..."
              className="min-h-[80px]"
              disabled={disabled}
            />
            <Button
              onClick={handleCreatePrompt}
              size="sm"
              disabled={!newPromptName.trim() || !newPromptContent.trim() || disabled}
              className="w-full"
            >
              <Check className="w-4 h-4 mr-2" />
              Create Prompt
            </Button>
          </div>
        )}

        <ScrollArea className="h-[200px]">
          {prompts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No prompts added yet</p>
              <p className="text-xs mt-1">Add an agent or create a custom prompt</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prompts.map((prompt) => {
                const isSelected = selectedPromptIds.includes(prompt.id);
                return (
                  <div
                    key={prompt.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => !disabled && handleTogglePrompt(prompt.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="font-medium text-sm truncate">{prompt.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePrompt(prompt.id);
                        }}
                        disabled={disabled}
                        className="h-6 w-6 p-0 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 ml-7">
                      {prompt.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
