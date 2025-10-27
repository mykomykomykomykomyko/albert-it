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
    <header className="h-16 border-b border-border bg-card items-center justify-between px-6 shadow-sm hidden lg:flex">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={onAddStage}>
          <Plus className="h-4 w-4" />
          Stage
        </Button>
        <div className="w-px h-6 bg-border mx-2" />
        <Button variant="outline" size="sm" className="gap-2" onClick={onLoad}>
          <Upload className="h-4 w-4" />
          Load
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={onSave}>
          <Save className="h-4 w-4" />
          Save
        </Button>
        {onOpenMarketplace && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onOpenMarketplace}>
            <Store className="h-4 w-4" />
            Marketplace
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-2" onClick={onClear}>
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>
      <Button
        size="sm"
        className="gap-2 bg-gradient-to-r from-primary to-primary-hover"
        onClick={onRun}
      >
        <Play className="h-4 w-4" />
        Run
      </Button>
    </header>
  );
};