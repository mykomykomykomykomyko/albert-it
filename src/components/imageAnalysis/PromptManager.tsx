import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Sparkles, X, Plus, Check } from 'lucide-react';
import { AnalysisPrompt, PREDEFINED_PROMPTS } from '@/types/imageAnalysis';
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

  // Separate predefined and custom prompts
  const predefinedPrompts = prompts.filter(p => !p.isCustom);
  const customPrompts = prompts.filter(p => p.isCustom);

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
    <div className="space-y-4">
      {/* Quick Select - Predefined Prompts */}
      {predefinedPrompts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Quick Select</p>
          <div className="flex flex-wrap gap-2">
            {predefinedPrompts.map((prompt) => {
              const isSelected = selectedPromptIds.includes(prompt.id);
              return (
                <Badge
                  key={prompt.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer transition-all py-1.5 px-3 ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'
                  } ${isSelected ? '' : 'hover:border-primary hover:text-primary'}`}
                  onClick={() => !disabled && handleTogglePrompt(prompt.id)}
                >
                  {isSelected && <Check className="w-3 h-3 mr-1" />}
                  {prompt.name}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Prompts Section */}
      <div className="border rounded-lg bg-card">
        <div className="p-3 border-b">
          <div className="flex gap-2">
            <Button
              onClick={onOpenAgentSelector}
              variant="outline"
              size="sm"
              disabled={disabled}
              className="flex-1"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Add Agent
            </Button>
            <Button
              onClick={() => setIsCreating(!isCreating)}
              variant="outline"
              size="sm"
              disabled={disabled || isCreating}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Custom
            </Button>
          </div>
        </div>

        <div className="p-3">
          {isCreating && (
            <div className="mb-3 p-3 border rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Create Custom Prompt</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setNewPromptName('');
                    setNewPromptContent('');
                  }}
                  disabled={disabled}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
              <Input
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                placeholder="Prompt name..."
                disabled={disabled}
                className="h-8 text-sm"
              />
              <Textarea
                value={newPromptContent}
                onChange={(e) => setNewPromptContent(e.target.value)}
                placeholder="Enter your prompt..."
                className="min-h-[60px] text-sm"
                disabled={disabled}
              />
              <Button
                onClick={handleCreatePrompt}
                size="sm"
                disabled={!newPromptName.trim() || !newPromptContent.trim() || disabled}
                className="w-full h-8"
              >
                <Check className="w-3 h-3 mr-1" />
                Create
              </Button>
            </div>
          )}

          {customPrompts.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-xs">No custom prompts yet</p>
              <p className="text-xs mt-0.5">Add an agent or create a custom prompt</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[150px]">
              <div className="space-y-2">
                {customPrompts.map((prompt) => {
                  const isSelected = selectedPromptIds.includes(prompt.id);
                  return (
                    <div
                      key={prompt.id}
                      className={`p-2 border rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                      onClick={() => !disabled && handleTogglePrompt(prompt.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-xs truncate block">{prompt.name}</span>
                            {prompt.agentId && (
                              <span className="text-[10px] text-primary">Agent</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePrompt(prompt.id);
                          }}
                          disabled={disabled}
                          className="h-5 w-5 p-0 flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
