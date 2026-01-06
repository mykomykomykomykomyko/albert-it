import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Bot, 
  Settings, 
  Download, 
  ChevronDown,
  Sparkles,
  Eye,
  FileArchive,
  FileJson,
  FileText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFreeAgentSession } from '@/hooks/useFreeAgentSession';
import { FreeAgentModel, DEFAULT_FREE_AGENT_MODELS } from '@/types/freeAgent';
import { SessionControls } from './SessionControls';
import { MemoryPanel } from './MemoryPanel';
import { FreeAgentCanvas } from './FreeAgentCanvas';
import { cn } from '@/lib/utils';
import { downloadSession, downloadArtifact } from '@/utils/sessionExporter';
import { toast } from 'sonner';

interface FreeAgentPanelProps {
  className?: string;
}

export const FreeAgentPanel: React.FC<FreeAgentPanelProps> = ({ className }) => {
  const { t } = useTranslation('freeAgent');
  const {
    session,
    isProcessing,
    initializeSession,
    start,
    stop,
    pause,
    resume,
    reset,
    interject,
    clearMemory,
    exportSession,
    models,
  } = useFreeAgentSession();
  
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.id || 'gemini-flash');
  const [maxIterations, setMaxIterations] = useState(50);
  const [prompt, setPrompt] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'simple'>('canvas');

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0];

  const handleStart = () => {
    if (!prompt.trim() || !selectedModel) return;
    
    initializeSession({
      model: selectedModel,
      maxIterations,
      systemPrompt: 'You are a helpful AI agent that can use tools to accomplish tasks.',
      enabledTools: [],
      autoStart: true,
      loopDetectionThreshold: 3,
      timeoutSeconds: 300,
      memoryPersistence: 'session',
    });
    
    start(prompt);
  };

  const handleInterject = () => {
    const interjection = window.prompt(t('controls.interjectionPrompt', 'Enter your interjection:'));
    if (interjection) {
      interject(interjection);
    }
  };

  const handleExportZip = async () => {
    if (!session) return;
    try {
      await downloadSession(session);
      toast.success(t('export.success', 'Session exported successfully'));
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('export.failed', 'Failed to export session'));
    }
  };

  const handleExportJson = () => {
    if (!session) return;
    const exportData = exportSession();
    if (!exportData) return;
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${session.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('export.jsonSuccess', 'JSON exported successfully'));
  };

  const handleExportBlackboard = () => {
    if (!session) return;
    const content = session.blackboard.map(entry => 
      `## [${entry.type.toUpperCase()}] Iteration ${entry.iteration}\n\n${entry.content}\n\n---\n`
    ).join('\n');
    
    const blob = new Blob([`# Blackboard Export\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blackboard-${session.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('export.blackboardSuccess', 'Blackboard exported successfully'));
  };

  const handleClearMemory = () => {
    clearMemory('all');
  };

  const isRunning = session?.status === 'running';
  const isPaused = session?.status === 'paused';
  const hasSession = !!session;

  // Get tools used from artifacts or track separately
  const toolsUsed: string[] = session?.artifacts.map(a => a.name) || [];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {t('title', 'Free Agent')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === 'canvas' ? 'simple' : 'canvas')}
              >
                <Eye className="h-4 w-4 mr-1" />
                {viewMode === 'canvas' ? t('view.simple', 'Simple') : t('view.canvas', 'Canvas')}
              </Button>
              {hasSession && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportZip}>
                      <FileArchive className="h-4 w-4 mr-2" />
                      {t('export.zip', 'Export as ZIP')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportJson}>
                      <FileJson className="h-4 w-4 mr-2" />
                      {t('export.json', 'Export as JSON')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportBlackboard}>
                      <FileText className="h-4 w-4 mr-2" />
                      {t('export.blackboard', 'Export Blackboard')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label>{t('model.label', 'Model')}</Label>
            <Select 
              value={selectedModelId} 
              onValueChange={setSelectedModelId}
              disabled={isRunning}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.provider}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('prompt.label', 'Prompt')}</Label>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                {t('prompt.enhance', 'Enhance')}
              </Button>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('prompt.placeholder', 'Describe what you want the agent to accomplish...')}
              className="min-h-[100px] resize-none"
              disabled={isRunning}
            />
          </div>

          {/* Settings Collapsible */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('settings.title', 'Settings')}
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  settingsOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-4">
              {/* Max Iterations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('settings.maxIterations', 'Max Iterations')}</Label>
                  <span className="text-sm text-muted-foreground">{maxIterations}</span>
                </div>
                <Slider
                  value={[maxIterations]}
                  onValueChange={([v]) => setMaxIterations(v)}
                  min={1}
                  max={200}
                  step={1}
                  disabled={isRunning}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Session Controls */}
          <SessionControls
            isRunning={isRunning}
            isPaused={isPaused}
            hasSession={hasSession}
            currentIteration={session?.currentIteration || 0}
            maxIterations={session?.config.maxIterations || maxIterations}
            onStart={handleStart}
            onStop={stop}
            onPause={pause}
            onResume={resume}
            onReset={reset}
            onInterject={handleInterject}
            onClearMemory={handleClearMemory}
            disabled={isProcessing || !prompt.trim()}
          />

          {/* Error Display */}
          {session?.lastError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {session.lastError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Canvas/Simple View */}
      {viewMode === 'canvas' ? (
        <Card className="p-4">
          <FreeAgentCanvas
            activeTools={toolsUsed}
            usedTools={toolsUsed}
            currentTool={undefined}
            isRunning={isRunning}
            iteration={session?.currentIteration || 0}
          />
        </Card>
      ) : (
        <Card className="p-4">
          <div className="text-center text-muted-foreground py-8">
            {isRunning ? (
              <div className="space-y-2">
                <Bot className="h-12 w-12 mx-auto animate-pulse text-primary" />
                <p>{t('status.running', 'Agent is running...')}</p>
                <p className="text-sm">Iteration {session?.currentIteration || 0}</p>
              </div>
            ) : hasSession ? (
              <div className="space-y-2">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground" />
                <p>{t('status.completed', 'Session completed')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground" />
                <p>{t('status.ready', 'Ready to start')}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Memory Panel */}
      {hasSession && session && (
        <Card className="p-4">
          <MemoryPanel
            blackboard={session.blackboard}
            scratchpad={session.scratchpad}
            attributes={session.namedAttributes}
          />
        </Card>
      )}
    </div>
  );
};
