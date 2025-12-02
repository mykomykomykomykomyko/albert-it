import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SaveWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowData: any;
  currentName?: string;
}

export const SaveWorkflowDialog = ({ open, onOpenChange, workflowData, currentName }: SaveWorkflowDialogProps) => {
  const { t } = useTranslation('stage');
  const [name, setName] = useState(currentName || "");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('dialogs.save.enterName', 'Please enter a workflow name'));
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('workflows')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          workflow_data: workflowData,
        });

      if (error) throw error;
      
      toast.success(t('dialogs.save.success', 'Workflow saved successfully'));
      onOpenChange(false);
      setName("");
      setDescription("");
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error(t('dialogs.save.error', 'Failed to save workflow'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialogs.save.title', 'Save Workflow')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">{t('dialogs.save.workflowName', 'Workflow Name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('dialogs.save.enterWorkflowName', 'Enter workflow name')}
            />
          </div>
          <div>
            <Label htmlFor="description">{t('dialogs.save.descriptionOptional', 'Description (optional)')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('dialogs.save.enterDescription', 'Enter workflow description')}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('dialogs.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('dialogs.save.saveButton', 'Save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};