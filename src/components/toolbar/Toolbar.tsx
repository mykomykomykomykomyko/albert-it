import { Button } from "@/components/ui/button";
import { Play, Plus, Save, Upload, Trash2, HelpCircle } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ToolbarProps {
  onAddStage: () => void;
  onSave: () => void;
  onLoad: (file: File) => void;
  onClear: () => void;
  onRun: () => void;
}

export const Toolbar = ({
  onAddStage,
  onSave,
  onLoad,
  onClear,
  onRun
}: ToolbarProps) => {
  const { t } = useTranslation('stage');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoad(file);
      e.target.value = "";
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card items-center justify-between px-6 shadow-sm hidden lg:flex">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2" onClick={onAddStage}>
          <Plus className="h-4 w-4" />
          {t('toolbar.addStage')}
        </Button>
        <div className="w-px h-6 bg-border mx-2" />
        <Button variant="outline" size="sm" className="gap-2" onClick={handleLoadClick}>
          <Upload className="h-4 w-4" />
          {t('toolbar.load')}
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        <Button variant="outline" size="sm" className="gap-2" onClick={onSave}>
          <Save className="h-4 w-4" />
          {t('toolbar.save')}
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={onClear}>
          <Trash2 className="h-4 w-4" />
          {t('toolbar.clear')}
        </Button>
        <div className="w-px h-6 bg-border mx-2" />
        <Button className="gap-2 bg-gradient-to-r from-primary to-primary-hover hover:opacity-90" onClick={onRun}>
          <Play className="h-4 w-4" />
          {t('toolbar.runWorkflow')}
        </Button>
      </div>
    </header>
  );
};
