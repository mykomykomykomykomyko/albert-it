import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Square, 
  Pause, 
  RotateCcw, 
  MessageSquarePlus,
  Trash2,
  FastForward
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface SessionControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  hasSession: boolean;
  currentIteration: number;
  maxIterations: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onInterject: () => void;
  onClearMemory: () => void;
  disabled?: boolean;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  isRunning,
  isPaused,
  hasSession,
  currentIteration,
  maxIterations,
  onStart,
  onStop,
  onPause,
  onResume,
  onReset,
  onInterject,
  onClearMemory,
  disabled = false,
}) => {
  const { t } = useTranslation('freeAgent');

  return (
    <div className="flex flex-col gap-3">
      {/* Primary Controls */}
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <Button
            onClick={onStart}
            disabled={disabled}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {t('controls.start', 'Start')}
          </Button>
        ) : (
          <>
            {isPaused ? (
              <Button
                onClick={onResume}
                disabled={disabled}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <FastForward className="h-4 w-4 mr-2" />
                {t('controls.resume', 'Resume')}
              </Button>
            ) : (
              <Button
                onClick={onPause}
                disabled={disabled}
                variant="outline"
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                {t('controls.pause', 'Pause')}
              </Button>
            )}
            <Button
              onClick={onStop}
              disabled={disabled}
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              {t('controls.stop', 'Stop')}
            </Button>
          </>
        )}
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onInterject}
          disabled={disabled || !isRunning}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          {t('controls.interject', 'Interject')}
        </Button>
        <Button
          onClick={onReset}
          disabled={disabled || isRunning}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('controls.reset', 'Reset')}
        </Button>
        <Button
          onClick={onClearMemory}
          disabled={disabled || isRunning}
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Iteration Progress */}
      {hasSession && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300",
                isRunning ? "bg-primary animate-pulse" : "bg-primary"
              )}
              style={{ 
                width: `${Math.min((currentIteration / maxIterations) * 100, 100)}%` 
              }}
            />
          </div>
          <span className="tabular-nums min-w-[4rem] text-right">
            {currentIteration} / {maxIterations}
          </span>
        </div>
      )}
    </div>
  );
};
