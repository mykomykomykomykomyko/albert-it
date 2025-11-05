import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Plus, X, Repeat, Zap, TrendingUp } from "lucide-react";
import type { LoopExitCondition } from "@/types/workflow";

interface LoopConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: {
    isLoopEdge: boolean;
    maxIterations: number;
    exitConditions: LoopExitCondition[];
    convergenceThreshold: number;
    timeoutSeconds: number;
  }) => void;
  initialConfig?: {
    isLoopEdge?: boolean;
    maxIterations?: number;
    exitConditions?: LoopExitCondition[];
    convergenceThreshold?: number;
    timeoutSeconds?: number;
  };
}

// Preset configurations
const LOOP_PRESETS = {
  basic: {
    name: "Basic Loop (10 iterations)",
    maxIterations: 10,
    exitConditions: [{ type: 'max_iterations' as const }],
    convergenceThreshold: 0.95,
    timeoutSeconds: 300,
  },
  convergence: {
    name: "Until Convergence",
    maxIterations: 50,
    exitConditions: [
      { type: 'convergence' as const, threshold: 0.95 },
      { type: 'max_iterations' as const }
    ],
    convergenceThreshold: 0.95,
    timeoutSeconds: 300,
  },
  limited: {
    name: "Limited Loop (5 iterations)",
    maxIterations: 5,
    exitConditions: [{ type: 'max_iterations' as const }],
    convergenceThreshold: 0.95,
    timeoutSeconds: 60,
  },
};

export const LoopConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  initialConfig,
}: LoopConfigDialogProps) => {
  const [isLoopEdge, setIsLoopEdge] = useState(initialConfig?.isLoopEdge || false);
  const [maxIterations, setMaxIterations] = useState(initialConfig?.maxIterations || 10);
  const [convergenceThreshold, setConvergenceThreshold] = useState(
    initialConfig?.convergenceThreshold || 0.95
  );
  const [timeoutSeconds, setTimeoutSeconds] = useState(
    initialConfig?.timeoutSeconds || 300
  );
  const [exitConditions, setExitConditions] = useState<LoopExitCondition[]>(
    initialConfig?.exitConditions || [{ type: "max_iterations" }]
  );

  const handleAddCondition = () => {
    setExitConditions([...exitConditions, { type: "convergence", threshold: 0.95 }]);
  };

  const handleRemoveCondition = (index: number) => {
    setExitConditions(exitConditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (
    index: number,
    field: keyof LoopExitCondition,
    value: any
  ) => {
    const updated = [...exitConditions];
    updated[index] = { ...updated[index], [field]: value };
    setExitConditions(updated);
  };

  const applyPreset = (presetKey: keyof typeof LOOP_PRESETS) => {
    const preset = LOOP_PRESETS[presetKey];
    setMaxIterations(preset.maxIterations);
    setExitConditions(preset.exitConditions);
    setConvergenceThreshold(preset.convergenceThreshold);
    setTimeoutSeconds(preset.timeoutSeconds);
    setIsLoopEdge(true);
  };

  const handleSave = () => {
    onSave({
      isLoopEdge,
      maxIterations,
      exitConditions,
      convergenceThreshold,
      timeoutSeconds,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Loop Configuration
          </DialogTitle>
          <DialogDescription>
            Configure loop behavior, iterations, and exit conditions for this connection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable Loop */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Loop</Label>
              <p className="text-sm text-muted-foreground">
                Mark this connection as a loop edge to enable iterative execution
              </p>
            </div>
            <Switch checked={isLoopEdge} onCheckedChange={setIsLoopEdge} />
          </div>

          {isLoopEdge && (
            <>
              {/* Quick Presets */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Quick Presets</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Card 
                    className="p-3 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => applyPreset('basic')}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <Repeat className="h-5 w-5 text-primary" />
                      <div className="text-xs font-medium">Basic Loop</div>
                      <div className="text-[10px] text-muted-foreground">10 iterations</div>
                    </div>
                  </Card>
                  
                  <Card 
                    className="p-3 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => applyPreset('convergence')}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div className="text-xs font-medium">Convergence</div>
                      <div className="text-[10px] text-muted-foreground">Until stable</div>
                    </div>
                  </Card>
                  
                  <Card 
                    className="p-3 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => applyPreset('limited')}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <div className="text-xs font-medium">Limited</div>
                      <div className="text-[10px] text-muted-foreground">5 iterations</div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Max Iterations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Max Iterations</Label>
                  <span className="text-sm font-medium">{maxIterations}</span>
                </div>
                <Slider
                  value={[maxIterations]}
                  onValueChange={([value]) => setMaxIterations(value)}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of times the loop can execute (safety limit)
                </p>
              </div>

              {/* Timeout */}
              <div className="space-y-2">
                <Label>Timeout (seconds)</Label>
                <Input
                  type="number"
                  min={10}
                  max={3600}
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 300)}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum time the loop can run before being terminated
                </p>
              </div>

              {/* Convergence Threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Convergence Threshold</Label>
                  <span className="text-sm font-medium">
                    {(convergenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[convergenceThreshold * 100]}
                  onValueChange={([value]) => setConvergenceThreshold(value / 100)}
                  min={80}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  How similar outputs must be to consider the loop converged
                </p>
              </div>

              {/* Exit Conditions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Exit Conditions</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddCondition}
                    className="h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {exitConditions.map((condition, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <Select
                            value={condition.type}
                            onValueChange={(value: any) =>
                              handleConditionChange(index, "type", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="max_iterations">
                                Max Iterations
                              </SelectItem>
                              <SelectItem value="convergence">Convergence</SelectItem>
                              <SelectItem value="value_equals">Value Equals</SelectItem>
                              <SelectItem value="custom">Custom Expression</SelectItem>
                            </SelectContent>
                          </Select>

                          {condition.type === "value_equals" && (
                            <Input
                              placeholder="Target value..."
                              value={condition.value || ""}
                              onChange={(e) =>
                                handleConditionChange(index, "value", e.target.value)
                              }
                            />
                          )}

                          {condition.type === "custom" && (
                            <Input
                              placeholder='e.g., contains "success" or length > 100'
                              value={condition.value || ""}
                              onChange={(e) =>
                                handleConditionChange(index, "value", e.target.value)
                              }
                            />
                          )}

                          {condition.type === "convergence" && (
                            <div className="space-y-2">
                              <Label className="text-xs">
                                Threshold: {((condition.threshold || 0.95) * 100).toFixed(0)}
                                %
                              </Label>
                              <Slider
                                value={[(condition.threshold || 0.95) * 100]}
                                onValueChange={([value]) =>
                                  handleConditionChange(index, "threshold", value / 100)
                                }
                                min={80}
                                max={100}
                                step={1}
                              />
                            </div>
                          )}
                        </div>

                        {exitConditions.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveCondition(index)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Safety Info */}
              <Card className="p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  <strong>Safety Note:</strong> Multiple safety mechanisms prevent infinite
                  loops. The loop will exit when ANY condition is met, including max
                  iterations, timeout, convergence, or custom conditions.
                </p>
              </Card>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
