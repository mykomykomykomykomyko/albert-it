import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Database, Trash2, Users, Database as DatabaseIcon, Table2, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UuidMapping {
  oldUuid: string;
  newUuid: string;
  email: string;
}

interface TableStatus {
  name: string;
  loading: boolean;
  csvData: string | null;
  rowCount: number | null;
}

export const MigrationButton = () => {
  const [step1Loading, setStep1Loading] = useState(false);
  const [step2Loading, setStep2Loading] = useState(false);
  const [step3Loading, setStep3Loading] = useState(false);
  
  const [step1Complete, setStep1Complete] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);
  const [step3Complete, setStep3Complete] = useState(false);

  const [uuidCrosswalk, setUuidCrosswalk] = useState<UuidMapping[]>([]);
  const [step1Results, setStep1Results] = useState<any>(null);
  const [step2Results, setStep2Results] = useState<any>(null);
  const [step3Results, setStep3Results] = useState<any>(null);

  const tablesToMigrate = [
    'profiles', 'user_roles', 'user_preferences', 'user_temp_passwords',
    'access_codes', 'frameworks', 'agents', 'agent_shares', 'conversations',
    'messages', 'file_attachments', 'prompts', 'prompt_shares', 'prompt_executions',
    'workflows', 'workflow_shares', 'workflow_executions', 'saved_canvases',
    'saved_stages', 'image_analysis_sessions', 'image_analysis_images',
    'image_analysis_prompts', 'image_analysis_results', 'meeting_transcripts',
    'voice_analysis_results', 'chat_history'
  ];

  const [tableStatuses, setTableStatuses] = useState<TableStatus[]>(
    tablesToMigrate.map(name => ({ name, loading: false, csvData: null, rowCount: null }))
  );

  const handleStep1 = async () => {
    setStep1Loading(true);
    setStep1Results(null);
    setStep1Complete(false);
    
    try {
      toast.info("Step 1: Clearing all public tables...");
      
      const { data, error } = await supabase.functions.invoke('migrate-step1-clear-tables');

      if (error) {
        console.error('Step 1 error:', error);
        toast.error(`Step 1 failed: ${error.message}`);
        setStep1Loading(false);
        return;
      }

      console.log('Step 1 response:', data);
      setStep1Results(data);
      setStep1Complete(true);
      toast.success(`Step 1 complete: ${data.message}`);
    } catch (error) {
      console.error('Step 1 exception:', error);
      toast.error("Step 1 failed with an exception");
    } finally {
      setStep1Loading(false);
    }
  };

  const handleStep2 = async () => {
    setStep2Loading(true);
    setStep2Results(null);
    setStep2Complete(false);
    
    try {
      toast.info("Step 2: Clearing auth.users...");
      
      const { data, error } = await supabase.functions.invoke('migrate-step2-clear-auth');

      if (error) {
        console.error('Step 2 error:', error);
        toast.error(`Step 2 failed: ${error.message}`);
        setStep2Loading(false);
        return;
      }

      console.log('Step 2 response:', data);
      setStep2Results(data);
      setStep2Complete(true);
      toast.success(`Step 2 complete: ${data.message}`);
    } catch (error) {
      console.error('Step 2 exception:', error);
      toast.error("Step 2 failed with an exception");
    } finally {
      setStep2Loading(false);
    }
  };

  const handleStep3 = async () => {
    setStep3Loading(true);
    setStep3Results(null);
    setStep3Complete(false);
    setUuidCrosswalk([]);
    
    try {
      toast.info("Step 3: Populating auth.users and building UUID crosswalk...");
      
      const { data, error } = await supabase.functions.invoke('migrate-step3-populate-auth');

      if (error) {
        console.error('Step 3 error:', error);
        toast.error(`Step 3 failed: ${error.message}`);
        setStep3Loading(false);
        return;
      }

      console.log('Step 3 response:', data);
      setStep3Results(data);
      
      if (data?.uuidCrosswalk) {
        setUuidCrosswalk(data.uuidCrosswalk);
        console.log(`UUID Crosswalk received: ${data.uuidCrosswalk.length} mappings`);
      }
      
      setStep3Complete(true);
      toast.success(`Step 3 complete: ${data.message}`, { duration: 5000 });
    } catch (error) {
      console.error('Step 3 exception:', error);
      toast.error("Step 3 failed with an exception");
    } finally {
      setStep3Loading(false);
    }
  };

  const handleGenerateCSV = async (tableName: string, index: number) => {
    if (!uuidCrosswalk || uuidCrosswalk.length === 0) {
      toast.error("Please complete Step 3 first");
      return;
    }

    setTableStatuses(prev => prev.map((t, i) => 
      i === index ? { ...t, loading: true } : t
    ));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-step4-migrate-tables`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ uuidCrosswalk, tableName }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const sqlData = await response.text();
      const rowCount = sqlData.split('\n').filter(line => line.trim().startsWith('INSERT')).length;

      setTableStatuses(prev => prev.map((t, i) => 
        i === index ? { ...t, csvData: sqlData, rowCount, loading: false } : t
      ));

      toast.success(`Generated SQL for ${tableName}: ${rowCount} rows`);
    } catch (error: any) {
      setTableStatuses(prev => prev.map((t, i) => 
        i === index ? { ...t, loading: false } : t
      ));
      toast.error(`Failed to generate ${tableName}: ${error.message}`);
    }
  };

  const handleDownloadSQL = (tableName: string, sqlData: string) => {
    const blob = new Blob([sqlData], { type: 'application/sql' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}.sql`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success(`Downloaded ${tableName}.sql`);
  };

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            Sync to Albert Junior
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-4xl max-h-[90vh]">
          <AlertDialogHeader>
            <AlertDialogTitle>Migration to Albert Junior</AlertDialogTitle>
            <AlertDialogDescription>
              Complete the migration in 4 sequential steps. Each step must be completed successfully before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Step 1 */}
              <Card className={step1Complete ? "border-green-500" : ""}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Step 1: Clear Public Tables
                  </CardTitle>
                  <CardDescription>
                    Remove all existing data from public tables in Albert Junior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleStep1}
                    disabled={step1Loading}
                    className="w-full"
                  >
                    {step1Loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Clearing tables...
                      </>
                    ) : step1Complete ? (
                      "✓ Completed - Click to re-run"
                    ) : (
                      "Run Step 1"
                    )}
                  </Button>
                  {step1Results && (
                    <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
                      <p className="font-medium">{step1Results.message}</p>
                      {step1Results.results && (
                        <div className="text-xs">
                          {Object.entries(step1Results.results).map(([table, result]: [string, any]) => (
                            <div key={table}>
                              {table}: {result.deleted} rows {result.success ? "✓" : "✗"}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card className={step2Complete ? "border-green-500" : ""}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Step 2: Clear Auth Users
                  </CardTitle>
                  <CardDescription>
                    Remove all existing users from auth.users in Albert Junior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleStep2}
                    disabled={step2Loading}
                    className="w-full"
                  >
                    {step2Loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Clearing users...
                      </>
                    ) : step2Complete ? (
                      "✓ Completed - Click to re-run"
                    ) : (
                      "Run Step 2"
                    )}
                  </Button>
                  {step2Results && (
                    <div className="text-sm p-3 bg-muted rounded-md">
                      <p className="font-medium">{step2Results.message}</p>
                      <p className="text-xs">Users deleted: {step2Results.usersDeleted}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card className={step3Complete ? "border-green-500" : ""}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DatabaseIcon className="h-5 w-5" />
                    Step 3: Populate Auth & Build UUID Crosswalk
                  </CardTitle>
                  <CardDescription>
                    Create users in Albert Junior and map old UUIDs to new UUIDs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleStep3}
                    disabled={step3Loading}
                    className="w-full"
                  >
                    {step3Loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating users...
                      </>
                    ) : step3Complete ? (
                      "✓ Completed - Click to re-run"
                    ) : (
                      "Run Step 3"
                    )}
                  </Button>
                  {step3Results && (
                    <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
                      <p className="font-medium">{step3Results.message}</p>
                      <p className="text-xs">Users migrated: {step3Results.usersMigrated} / {step3Results.totalProfiles}</p>
                      <p className="text-xs">UUID mappings: {step3Results.uuidCrosswalk?.length || 0}</p>
                      {step3Results.errors?.length > 0 && (
                        <div className="text-xs text-red-500 mt-2">
                          <p className="font-medium">Errors:</p>
                          {step3Results.errors.slice(0, 5).map((err: string, i: number) => (
                            <p key={i}>{err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 4 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Table2 className="h-5 w-5" />
                    Step 4: Generate CSVs for Each Table
                  </CardTitle>
                  <CardDescription>
                    Generate and download CSV files for each table (requires Step 3 crosswalk)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!step3Complete ? (
                    <div className="text-sm text-muted-foreground p-4 border rounded-md">
                      Complete Step 3 first to enable table migration
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="p-2 text-left font-medium">Table</th>
                              <th className="p-2 text-center font-medium">Rows</th>
                              <th className="p-2 text-right font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tableStatuses.map((table, index) => (
                              <tr key={table.name} className="border-t">
                                <td className="p-2 font-mono text-xs">{table.name}</td>
                                <td className="p-2 text-center">
                                  {table.rowCount !== null ? table.rowCount : '-'}
                                </td>
                                <td className="p-2 text-right">
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleGenerateCSV(table.name, index)}
                                      disabled={table.loading}
                                    >
                                      {table.loading ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        'Generate'
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleDownloadSQL(table.name, table.csvData!)}
                                      disabled={!table.csvData}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
