import { Button } from "@/components/ui/button";
import { Play, Plus, Save, Upload, Trash2, Store } from "lucide-react";

interface ToolbarProps {
  onAddStage: () => void;
  onRun: () => void;
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
  onOpenMarketplace?: () => void;
}

export const Toolbar = ({
  onAddStage,
  onRun,
  onSave,
  onLoad,
  onClear,
  onOpenMarketplace
}: ToolbarProps) => {
  return (
    <header className="min-h-16 border-b border-border bg-card px-3 sm:px-6 py-2 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={onAddStage}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stage</span>
          </Button>
          <div className="hidden sm:block w-px h-6 bg-border" />
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={onLoad}>
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Load</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={onSave}>
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save</span>
          </Button>
          {onOpenMarketplace && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={onOpenMarketplace}>
              <Store className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Marketplace</span>
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-gradient-to-r from-primary to-primary-hover h-8 w-full sm:w-auto"
          onClick={onRun}
        >
          <Play className="h-3.5 w-3.5" />
          Run
        </Button>
      </div>
    </header>
  );
};