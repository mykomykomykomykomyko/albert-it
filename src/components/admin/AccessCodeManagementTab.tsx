import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Copy, Eye, EyeOff, Pencil, Trash2, RefreshCw } from 'lucide-react';

interface AccessCode {
  id: string;
  code: string;
  description: string | null;
  is_active: boolean | null;
  max_uses: number | null;
  current_uses: number | null;
  expires_at: string | null;
  created_at: string;
}

export function AccessCodeManagementTab() {
  const { t } = useTranslation('admin');
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<AccessCode | null>(null);
  
  // Form states
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMaxUses, setFormMaxUses] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    loadAccessCodes();
  }, []);

  const loadAccessCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error loading access codes:', error);
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const resetForm = () => {
    setFormCode('');
    setFormDescription('');
    setFormMaxUses('');
    setFormExpiresAt('');
    setFormIsActive(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormCode(generateRandomCode());
    setCreateDialogOpen(true);
  };

  const openEditDialog = (code: AccessCode) => {
    setSelectedCode(code);
    setFormCode(code.code);
    setFormDescription(code.description || '');
    setFormMaxUses(code.max_uses?.toString() || '');
    setFormExpiresAt(code.expires_at ? code.expires_at.split('T')[0] : '');
    setFormIsActive(code.is_active ?? true);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (code: AccessCode) => {
    setSelectedCode(code);
    setDeleteDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formCode.trim()) {
      toast.error(t('accessCodes.codeRequired'));
      return;
    }

    try {
      const { error } = await supabase.from('access_codes').insert({
        code: formCode.toUpperCase(),
        description: formDescription || null,
        max_uses: formMaxUses ? parseInt(formMaxUses) : null,
        expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
        is_active: formIsActive,
      });

      if (error) throw error;

      toast.success(t('accessCodes.created'));
      setCreateDialogOpen(false);
      resetForm();
      loadAccessCodes();
    } catch (error: any) {
      console.error('Error creating access code:', error);
      if (error.code === '23505') {
        toast.error(t('accessCodes.duplicateCode'));
      } else {
        toast.error(t('error'));
      }
    }
  };

  const handleUpdate = async () => {
    if (!selectedCode) return;

    try {
      const { error } = await supabase
        .from('access_codes')
        .update({
          description: formDescription || null,
          max_uses: formMaxUses ? parseInt(formMaxUses) : null,
          expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
          is_active: formIsActive,
        })
        .eq('id', selectedCode.id);

      if (error) throw error;

      toast.success(t('accessCodes.updated'));
      setEditDialogOpen(false);
      setSelectedCode(null);
      resetForm();
      loadAccessCodes();
    } catch (error) {
      console.error('Error updating access code:', error);
      toast.error(t('error'));
    }
  };

  const handleDelete = async () => {
    if (!selectedCode) return;

    try {
      const { error } = await supabase
        .from('access_codes')
        .delete()
        .eq('id', selectedCode.id);

      if (error) throw error;

      toast.success(t('accessCodes.deleted'));
      setDeleteDialogOpen(false);
      setSelectedCode(null);
      loadAccessCodes();
    } catch (error) {
      console.error('Error deleting access code:', error);
      toast.error(t('error'));
    }
  };

  const toggleCodeVisibility = (id: string) => {
    setVisibleCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t('accessCodes.copied'));
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const toggleActive = async (code: AccessCode) => {
    try {
      const { error } = await supabase
        .from('access_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id);

      if (error) throw error;

      toast.success(code.is_active ? t('accessCodes.deactivated') : t('accessCodes.activated'));
      loadAccessCodes();
    } catch (error) {
      console.error('Error toggling access code:', error);
      toast.error(t('error'));
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('accessCodes.never');
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t('loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('accessCodes.title')}</CardTitle>
            <CardDescription>{t('accessCodes.description')}</CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            {t('accessCodes.generate')}
          </Button>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('accessCodes.noCodes')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accessCodes.code')}</TableHead>
                  <TableHead>{t('accessCodes.descriptionLabel')}</TableHead>
                  <TableHead>{t('accessCodes.status')}</TableHead>
                  <TableHead>{t('accessCodes.usage')}</TableHead>
                  <TableHead>{t('accessCodes.expires')}</TableHead>
                  <TableHead>{t('accessCodes.createdAt')}</TableHead>
                  <TableHead className="text-right">{t('accessCodes.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <span>
                          {visibleCodes.has(code.id) ? code.code : '••••••••'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleCodeVisibility(code.id)}
                        >
                          {visibleCodes.has(code.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {code.description || (
                        <span className="text-muted-foreground italic">
                          {t('accessCodes.noDescription')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isExpired(code.expires_at) ? (
                        <Badge variant="destructive">{t('accessCodes.expired')}</Badge>
                      ) : code.is_active ? (
                        <Badge variant="default">{t('accessCodes.active')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('accessCodes.inactive')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.current_uses ?? 0} / {code.max_uses ?? '∞'}
                    </TableCell>
                    <TableCell>{formatDate(code.expires_at)}</TableCell>
                    <TableCell>{formatDate(code.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleActive(code)}
                          title={code.is_active ? t('accessCodes.deactivate') : t('accessCodes.activate')}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(code)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(code)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accessCodes.generate')}</DialogTitle>
            <DialogDescription>{t('accessCodes.generateDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t('accessCodes.code')}</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormCode(generateRandomCode())}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('accessCodes.descriptionLabel')}</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t('accessCodes.descriptionPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUses">{t('accessCodes.maxUses')}</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  placeholder={t('accessCodes.unlimited')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">{t('accessCodes.expiresAt')}</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">{t('accessCodes.activeOnCreate')}</Label>
              <Switch
                id="isActive"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t('accessCodes.cancel')}
            </Button>
            <Button onClick={handleCreate}>{t('accessCodes.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accessCodes.edit')}</DialogTitle>
            <DialogDescription>
              {t('accessCodes.editDescription')} <span className="font-mono">{selectedCode?.code}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDescription">{t('accessCodes.descriptionLabel')}</Label>
              <Input
                id="editDescription"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t('accessCodes.descriptionPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editMaxUses">{t('accessCodes.maxUses')}</Label>
                <Input
                  id="editMaxUses"
                  type="number"
                  min="1"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  placeholder={t('accessCodes.unlimited')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editExpiresAt">{t('accessCodes.expiresAt')}</Label>
                <Input
                  id="editExpiresAt"
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="editIsActive">{t('accessCodes.active')}</Label>
              <Switch
                id="editIsActive"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('accessCodes.cancel')}
            </Button>
            <Button onClick={handleUpdate}>{t('accessCodes.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accessCodes.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('accessCodes.deleteConfirm')} <span className="font-mono font-bold">{selectedCode?.code}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('accessCodes.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('accessCodes.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
