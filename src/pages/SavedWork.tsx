import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StandardAppLayout } from '@/components/layout/StandardAppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useSavedCanvases } from '@/hooks/useSavedCanvases';
import { useSavedStages } from '@/hooks/useSavedStages';
import { Loader2, Trash2, Eye, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SavedWork() {
  const navigate = useNavigate();
  const { t } = useTranslation('savedWork');
  const { savedCanvases, loading: loadingCanvases, deleteCanvas } = useSavedCanvases();
  const { savedStages, loading: loadingStages, deleteStage } = useSavedStages();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'canvas' | 'stage'; name: string } | null>(null);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'canvas') {
      await deleteCanvas(itemToDelete.id);
    } else {
      await deleteStage(itemToDelete.id);
    }
    
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const openDeleteDialog = (id: string, type: 'canvas' | 'stage', name: string) => {
    setItemToDelete({ id, type, name });
    setDeleteDialogOpen(true);
  };

  return (
    <StandardAppLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>

        <Tabs defaultValue="canvases" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="canvases" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('tabs.canvases')} ({savedCanvases.length})
            </TabsTrigger>
            <TabsTrigger value="stages" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('tabs.stages')} ({savedStages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="canvases" className="mt-0">
            {loadingCanvases ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : savedCanvases.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">{t('canvas.noItems')}</p>
                  <Button onClick={() => navigate('/canvas')}>
                    {t('canvas.createFirst')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedCanvases.map((canvas) => (
                  <Card key={canvas.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">{canvas.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {canvas.description || t('details.description')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        <Calendar className="h-3 w-3" />
                        <span>{t('details.updated')} {format(new Date(canvas.updated_at), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate('/canvas', { state: { loadCanvasId: canvas.id } })}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('actions.load')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(canvas.id, 'canvas', canvas.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stages" className="mt-0">
            {loadingStages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : savedStages.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">{t('stage.noItems')}</p>
                  <Button onClick={() => navigate('/stage')}>
                    {t('stage.createFirst')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedStages.map((stage) => (
                  <Card key={stage.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">{stage.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {stage.description || t('details.description')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        <Calendar className="h-3 w-3" />
                        <span>{t('details.updated')} {format(new Date(stage.updated_at), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate('/stage', { state: { loadStageId: stage.id } })}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('actions.load')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(stage.id, 'stage', stage.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('actions.delete')} {itemToDelete?.type}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('messages.deleted')} "{itemToDelete?.name}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.load')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>{t('actions.delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </StandardAppLayout>
  );
}