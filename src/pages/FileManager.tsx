import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChatHeader } from '@/components/ChatHeader';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  File,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  Trash2,
  Download,
  Search,
  Filter,
  Eye,
  Calendar,
  HardDrive,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface FileAttachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  mime_type: string | null;
  thumbnail_url: string | null;
  data_url: string | null;
  created_at: string;
  conversation_id: string | null;
}

const FileManager = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('files');
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    filterFiles();
  }, [searchQuery, filterType, files]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    loadFiles();
  };

  const loadFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('file_attachments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      toast.error(t('upload.error'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterFiles = () => {
    let filtered = [...files];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(file =>
        file.filename.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(file => file.file_type === filterType);
    }

    setFilteredFiles(filtered);
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;

    try {
      const { error } = await supabase
        .from('file_attachments')
        .delete()
        .eq('id', fileToDelete);

      if (error) throw error;

      toast.success(t('messages.deleted'));
      setFiles(files.filter(f => f.id !== fileToDelete));
    } catch (error: any) {
      toast.error(t('messages.error'));
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handleDownload = async (file: FileAttachment) => {
    try {
      if (file.data_url) {
        const link = document.createElement('a');
        link.href = file.data_url;
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(t('messages.downloaded'));
      } else {
        toast.error(t('messages.error'));
      }
    } catch (error) {
      toast.error(t('messages.error'));
      console.error(error);
    }
  };

  const handleView = (file: FileAttachment) => {
    if (file.conversation_id) {
      navigate(`/chat/${file.conversation_id}`);
    } else {
      toast.info(t('messages.error'));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (file: FileAttachment) => {
    if (file.file_type === 'image') return ImageIcon;
    if (file.filename.match(/\.(xlsx?|csv)$/i)) return FileSpreadsheet;
    if (file.filename.match(/\.(txt|doc|docx|pdf)$/i)) return FileText;
    return File;
  };

  const getTotalSize = () => {
    return files.reduce((sum, file) => sum + file.file_size, 0);
  };

  const getFileTypeCount = (type: string) => {
    return files.filter(f => f.file_type === type).length;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('upload.uploading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />

      <div className="flex-1 overflow-hidden p-6">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
            <p className="text-muted-foreground">
              {t('description')}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <File className="h-4 w-4" />
                  {t('list.name')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{files.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {t('types.image')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{getFileTypeCount('image')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('types.document')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{getFileTypeCount('text')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  {t('list.size')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatFileSize(getTotalSize())}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter')}</SelectItem>
                <SelectItem value="image">{t('types.image')}</SelectItem>
                <SelectItem value="text">{t('types.document')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Files Grid */}
          <ScrollArea className="flex-1">
            {filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <File className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {files.length === 0
                    ? t('list.noFiles')
                    : t('list.noFiles')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                {filteredFiles.map((file) => {
                  const Icon = getFileIcon(file);
                  return (
                    <Card key={file.id} className="group hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        {/* Preview */}
                        <div className="mb-3">
                          {file.file_type === 'image' && file.data_url ? (
                            <div className="aspect-video rounded-md overflow-hidden bg-muted">
                              <img
                                src={file.data_url}
                                alt={file.filename}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="aspect-video rounded-md bg-secondary flex items-center justify-center">
                              <Icon className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="space-y-2">
                          <p
                            className="text-sm font-medium truncate"
                            title={file.filename}
                          >
                            {file.filename}
                          </p>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(file.created_at)}
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {formatFileSize(file.file_size)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {file.file_type}
                            </Badge>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleView(file)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              {t('actions.preview')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(file)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFileToDelete(file.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actions.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('messages.deleted')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.preview')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FileManager;