import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Download, Upload, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TranslationFile {
  language: string;
  namespace: string;
  content: any;
}

export const TranslationManager = () => {
  const { t, i18n } = useTranslation('common');
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Get current translations from i18n
      const languages = ['en', 'fr'];
      const namespaces = ['common', 'landing'];
      
      const translations: TranslationFile[] = [];
      
      for (const lang of languages) {
        for (const ns of namespaces) {
          const bundle = i18n.getResourceBundle(lang, ns);
          if (bundle) {
            translations.push({
              language: lang,
              namespace: ns,
              content: bundle,
            });
          }
        }
      }

      // Create a downloadable JSON file
      const dataStr = JSON.stringify(translations, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `translations-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Translations downloaded successfully');
    } catch (error) {
      console.error('Error downloading translations:', error);
      toast.error('Failed to download translations');
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const translations: TranslationFile[] = JSON.parse(text);

      // Validate structure
      if (!Array.isArray(translations)) {
        throw new Error('Invalid translation file format');
      }

      // Add translations to i18n
      for (const trans of translations) {
        if (!trans.language || !trans.namespace || !trans.content) {
          throw new Error('Invalid translation entry');
        }
        
        i18n.addResourceBundle(trans.language, trans.namespace, trans.content, true, true);
      }

      // Save to Supabase for persistence
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Store in Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('translations')
        .upload(`${Date.now()}-translations.json`, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      toast.success('Translations uploaded and applied successfully');
      
      // Reload the page to apply new translations
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error uploading translations:', error);
      toast.error('Failed to upload translations. Please check the file format.');
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset input
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Translation Management</CardTitle>
          <CardDescription>
            Download current translations or upload updated translation files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Translation files contain all text content in JSON format. Download to edit, then upload to apply changes.
              Changes will be applied immediately and persist across sessions.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2"
            >
              {downloading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download Translations
            </Button>

            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
                id="translation-upload"
              />
              <label htmlFor="translation-upload">
                <Button
                  disabled={uploading}
                  className="flex items-center gap-2"
                  asChild
                >
                  <span>
                    {uploading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload Translations
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-2">Current Languages</h3>
            <div className="flex gap-2">
              <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                English
              </div>
              <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                Français
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-2">Translation File Structure</h3>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`[
  {
    "language": "en",
    "namespace": "common",
    "content": {
      "navigation": {
        "chat": "Chat",
        "agents": "Agents"
      }
    }
  }
]`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
