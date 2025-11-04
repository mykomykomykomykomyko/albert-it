import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Repeat, Clock, TrendingUp, XCircle } from "lucide-react";
import type { LoopMetadata } from "@/types/workflow";
import { BreakConditionEvaluator } from "@/lib/breakConditions";
import { checkConvergence } from "@/lib/convergenceDetection";

interface LoopMonitorProps {
  loops: LoopMetadata[];
  onForceStop: (loopId: string) => void;
}

export const LoopMonitor = ({ loops, onForceStop }: LoopMonitorProps) => {
  if (loops.length === 0) return null;

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Card className="p-4 space-y-4 bg-card/50 backdrop-blur">
      <div className="flex items-center gap-2">
        <Repeat className="h-5 w-5 text-primary animate-spin" />
        <h3 className="font-semibold">Active Loops</h3>
        <Badge variant="secondary">{loops.length}</Badge>
      </div>

      <div className="space-y-3">
        {loops.map((loop) => {
          const elapsed = Date.now() - loop.startTime;
          const progress = (loop.currentIteration / loop.maxIterations) * 100;
          const remainingTime = BreakConditionEvaluator.getEstimatedRemainingTime(loop);
          const convergenceInfo = loop.history.length >= 2
            ? checkConvergence(loop.history)
            : null;

          return (
            <Card key={loop.loopId} className="p-3 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Loop {loop.loopId.slice(-8)}</span>
                    <Badge variant="outline" className="text-xs">
                      {loop.nodes.size} nodes
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Iteration {loop.currentIteration} of {loop.maxIterations}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onForceStop(loop.loopId)}
                  className="h-7 px-2"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Elapsed: {formatTime(elapsed)}</span>
                </div>

                {remainingTime !== null && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Est. remaining: {formatTime(remainingTime)}</span>
                  </div>
                )}

                {convergenceInfo && (
                  <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                    <TrendingUp className="h-3 w-3" />
                    <span>
                      Similarity: {(convergenceInfo.similarity * 100).toFixed(1)}%
                      {convergenceInfo.converged && (
                        <Badge variant="default" className="ml-2 text-xs bg-green-500">
                          Converged
                        </Badge>
                      )}
                      {convergenceInfo.oscillating && (
                        <Badge variant="default" className="ml-2 text-xs bg-yellow-500">
                          Oscillating
                        </Badge>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Timeout Warning */}
              {loop.timeoutMs && elapsed > loop.timeoutMs * 0.8 && (
                <div className="text-xs text-warning flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Approaching timeout ({formatTime(loop.timeoutMs - elapsed)} remaining)
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </Card>
  );
};
