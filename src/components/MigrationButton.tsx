import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Database } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const MigrationButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [clearData, setClearData] = useState(true);
  const [progress, setProgress] = useState<string>('');
  const [progressDetails, setProgressDetails] = useState<string[]>([]);

  const handleMigration = async () => {
    setIsLoading(true);
    setProgress('Starting migration...');
    setProgressDetails(['Initializing connection to Albert Junior']);
    
    try {
      toast.info("Starting migration to Albert Junior...");
      setProgressDetails(prev => [...prev, 'Sending migration request...']);
      
      const { data, error } = await supabase.functions.invoke('migrate-to-new-supabase', {
        body: { clearBeforeMigration: clearData }
      });

      if (error) {
        console.error('Migration error:', error);
        setProgress('Migration failed');
        setProgressDetails(prev => [...prev, `Error: ${error.message}`]);
        toast.error(`Migration failed: ${error.message}`);
        return;
      }

      console.log('Migration results:', data);
      
      if (data?.success) {
        setProgress('Migration completed successfully');
        setProgressDetails(prev => [...prev, 'All data migrated']);
        toast.success("Migration completed successfully!");
        toast.info(`Users migrated: ${data.results.users.migrated}/${data.results.users.total}`);
        
        const successfulTables = Object.entries(data.results.tables)
          .filter(([_, info]: [string, any]) => info.success)
          .length;
        
        toast.info(`Tables migrated: ${successfulTables}/${Object.keys(data.results.tables).length}`);
        
        if (data.results.users.errors.length > 0) {
          console.warn('User migration errors:', data.results.users.errors);
        }
      } else {
        setProgress('Migration completed with errors');
        setProgressDetails(prev => [...prev, 'Check console for details']);
        toast.error("Migration completed with errors. Check console for details.");
      }
    } catch (error) {
      console.error('Exception during migration:', error);
      setProgress('Migration failed');
      setProgressDetails(prev => [...prev, `Exception: ${error}`]);
      toast.error("Migration failed with an exception. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                Sync to Albert Junior
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Migrate to Albert Junior?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">
                ⚠️ IMPORTANT: Schema must be set up first!
              </p>
              <p>
                This migration only copies data. Before running:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                <li>Apply all migrations: <code className="bg-muted px-1 rounded">supabase db push</code></li>
                <li>Deploy edge functions: <code className="bg-muted px-1 rounded">supabase functions deploy</code></li>
                <li>Configure secrets and storage buckets</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                See <code className="bg-muted px-1 rounded">MIGRATION_GUIDE.md</code> for complete instructions
              </p>
              <p className="font-semibold text-foreground mt-4">
                Migration will copy:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All users (with temporary passwords requiring reset)</li>
                <li>All table data</li>
              </ul>
              <div className="flex items-center space-x-2 mt-4 p-3 bg-muted rounded-md">
                <input
                  type="checkbox"
                  id="clearData"
                  checked={clearData}
                  onChange={(e) => setClearData(e.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                />
                <label htmlFor="clearData" className="text-sm cursor-pointer">
                  Clear existing data before migration (recommended for re-runs)
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMigration} disabled={isLoading}>
              {isLoading ? "Migrating..." : "Start Migration"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full border">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <h3 className="text-lg font-semibold">{progress || 'Processing...'}</h3>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {progressDetails.map((detail, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  • {detail}
                </p>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
              Do not close this window. This process may take several minutes depending on data size.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
