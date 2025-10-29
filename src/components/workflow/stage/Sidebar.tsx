import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Search, FileText, Bot, Plus, Download, Trash2, X, Eye, Zap, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FunctionRegistry } from "@/lib/functionRegistry";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { extractTextFromFile, formatExtractedContent, ExtractedContent } from "@/utils/fileTextExtraction";
import { parseExcelFile, ExcelData } from "@/utils/parseExcel";
import { ExcelSelector } from "@/components/ExcelSelector";
import { AgentSelectorDialog } from "@/components/agents/AgentSelectorDialog";
import { Agent } from "@/hooks/useAgents";

// Icon mapping for serialization
const iconMap: Record<string, LucideIcon> = {
  Search,
  FileText,
  Bot
};
const tools = [{
  id: "google_search",
  name: "Google Search",
  icon: Search,
  description: "Search the web for information",
  requiresApiKey: true
}, {
  id: "weather",
  name: "Weather",
  icon: Search,
  description: "Get current weather data",
  requiresApiKey: true
}, {
  id: "time",
  name: "Time",
  icon: Search,
  description: "Get current time/date",
  requiresApiKey: false
}, {
  id: "api_call",
  name: "API Call",
  icon: Search,
  description: "Call external APIs",
  requiresApiKey: true
}, {
  id: "web_scrape",
  name: "Web Scrape",
  icon: Search,
  description: "Extract web page content",
  requiresApiKey: false
}];
interface SidebarProps {
  onAddAgent: (stageId: string, agentTemplate: any) => void;
  onAddNode: (stageId: string, template: any, nodeType: "agent" | "function" | "tool") => void;
  workflow: any;
  userInput: string;
  onUserInputChange: (value: string) => void;
  workflowName: string;
  onWorkflowNameChange: (value: string) => void;
  customAgents: any[];
  onCustomAgentsChange: (agents: any[]) => void;
  savedAgents: Agent[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}
export const Sidebar = ({
  onAddAgent,
  onAddNode,
  workflow,
  userInput,
  onUserInputChange,
  workflowName,
  onWorkflowNameChange,
  customAgents,
  onCustomAgentsChange,
  savedAgents,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) => {
  const [functionSearch, setFunctionSearch] = useState("");
  const [functionCategory, setFunctionCategory] = useState<string>("all");
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [excelQueue, setExcelQueue] = useState<File[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isViewInputOpen, setIsViewInputOpen] = useState(false);
  const [editedInput, setEditedInput] = useState("");
  const [inputTab, setInputTab] = useState("edit");
  const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  
  // Convert saved agents to agent templates format
  const allSavedAgentTemplates = savedAgents.map(agent => ({
    id: agent.id,
    name: agent.name,
    iconName: agent.icon_name || "Bot",
    description: agent.description || "",
    defaultSystemPrompt: agent.system_prompt,
    defaultUserPrompt: agent.user_prompt,
    profile_picture_url: agent.profile_picture_url
  }));
  
  // Filter agents based on search
  const filteredAgents = agentSearch 
    ? allSavedAgentTemplates.filter(agent => 
        agent.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
        agent.description.toLowerCase().includes(agentSearch.toLowerCase())
      )
    : allSavedAgentTemplates.slice(0, 3); // Show top 3 by default when not searching
  
  const handleDragStart = (e: React.DragEvent, template: any, nodeType: "agent" | "function" | "tool" = "agent") => {
    e.dataTransfer.setData("agentTemplate", JSON.stringify(template));
    e.dataTransfer.setData("nodeType", nodeType);
  };
  
  const handleDownloadAgent = (agent: any) => {
    const agentData = {
      ...agent,
      type: "agent-definition",
      exportedAt: new Date().toISOString()
    };
    const json = JSON.stringify(agentData, null, 2);
    const blob = new Blob([json], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agent.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-agent.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Agent downloaded",
      description: `Agent "${agent.name}" has been downloaded`
    });
  };
  const handleDeleteAgent = (agentId: string) => {
    const agent = customAgents.find(a => a.id === agentId);
    if (agent) {
      onCustomAgentsChange(customAgents.filter(a => a.id !== agentId));
      toast({
        title: "Agent deleted",
        description: `Agent "${agent.name}" has been deleted`
      });
    }
  };
  
  const processNextExcel = async () => {
    if (excelQueue.length === 0) {
      setIsProcessingFiles(false);
      return;
    }
    const nextFile = excelQueue[0];
    try {
      const excelData = await parseExcelFile(nextFile);
      setExcelData(excelData);
      setExcelQueue(prev => prev.slice(1)); // Remove processed file from queue
    } catch (error) {
      console.error(`Failed to parse Excel file ${nextFile.name}:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to parse ${nextFile.name}`;
      toast({
        title: "Excel parsing failed",
        description: errorMessage,
        variant: "destructive"
      });
      setExcelQueue(prev => prev.slice(1)); // Remove failed file and continue

      // Try next file after a short delay
      setTimeout(() => {
        if (excelQueue.length > 1) {
          processNextExcel();
        } else {
          setIsProcessingFiles(false);
        }
      }, 500);
    }
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);
    const extractedContents: ExtractedContent[] = [];
    const excelFiles: File[] = [];
    try {
      // First, categorize all files
      for (const file of Array.from(files)) {
        const extension = file.name.toLowerCase().split('.').pop();
        if (extension === 'xlsx' || extension === 'xls') {
          excelFiles.push(file);
        } else {
          // Try to process as text-based file (includes txt, docx, pdf, and all code/config files)
          try {
            const extracted = await extractTextFromFile(file);
            extractedContents.push(extracted);
            toast({
              title: "File extracted",
              description: `Extracted text from ${file.name}`
            });
          } catch (error) {
            console.error(`Failed to extract from ${file.name}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast({
              title: "Extraction failed",
              description: errorMessage.includes('Unsupported file type') ? `Unsupported file type: ${file.name}` : `Failed to extract text from ${file.name}`,
              variant: "destructive"
            });
          }
        }
      }

      // Add all extracted text content to input first
      if (extractedContents.length > 0) {
        const formattedContent = formatExtractedContent(extractedContents);
        const newInput = userInput ? `${userInput}${formattedContent}` : formattedContent.trim();
        onUserInputChange(newInput);
      }

      // Then process Excel files one by one
      if (excelFiles.length > 0) {
        setExcelQueue(excelFiles);
        // Process the first Excel file
        try {
          const firstExcel = excelFiles[0];
          const excelData = await parseExcelFile(firstExcel);
          setExcelData(excelData);
          setExcelQueue(excelFiles.slice(1)); // Queue the rest
        } catch (error) {
          console.error('Failed to parse first Excel file:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to parse Excel file';
          toast({
            title: "Excel parsing failed",
            description: errorMessage,
            variant: "destructive"
          });
          // Try to process the rest if there are more
          if (excelFiles.length > 1) {
            setExcelQueue(excelFiles.slice(1));
            setTimeout(() => processNextExcel(), 500);
          } else {
            setIsProcessingFiles(false);
          }
        }
      } else {
        setIsProcessingFiles(false);
      }
    } catch (error) {
      console.error("File processing error:", error);
      toast({
        title: "Processing failed",
        description: "Failed to process files",
        variant: "destructive"
      });
      setIsProcessingFiles(false);
    } finally {
      // Reset file input
      if (fileUploadInputRef.current) {
        fileUploadInputRef.current.value = "";
      }
    }
  };
  const handleExcelSelect = (selectedData: {
    fileName: string;
    selectedData: any[];
    formattedContent: string;
    totalRows: number;
  }) => {
    const newInput = userInput ? `${userInput}${selectedData.formattedContent}` : selectedData.formattedContent.trim();
    onUserInputChange(newInput);
    toast({
      title: "Excel data added",
      description: `Added ${selectedData.totalRows} rows from ${selectedData.fileName}`
    });
    setExcelData(null);

    // Process next Excel file if any
    if (excelQueue.length > 0) {
      processNextExcel();
    } else {
      setIsProcessingFiles(false);
    }
  };
  const handleExcelClose = () => {
    setExcelData(null);

    // Process next Excel file if any
    if (excelQueue.length > 0) {
      processNextExcel();
    } else {
      setIsProcessingFiles(false);
    }
  };
  const handleClearInput = () => {
    onUserInputChange("");
    toast({
      title: "Input cleared",
      description: "Input has been cleared"
    });
  };
  const handleViewInput = () => {
    setEditedInput(userInput);
    setIsViewInputOpen(true);
  };
  const handleSaveEditedInput = () => {
    onUserInputChange(editedInput);
    setIsViewInputOpen(false);
    toast({
      title: "Input updated",
      description: "Your changes have been saved"
    });
  };
  
  const handleAgentSelect = (agent: Agent) => {
    const agentTemplate = {
      id: agent.id,
      name: agent.name,
      iconName: agent.icon_name || "Bot",
      description: agent.description || "",
      defaultSystemPrompt: agent.system_prompt,
      defaultUserPrompt: agent.user_prompt,
      profile_picture_url: agent.profile_picture_url
    };
    
    // Get the first stage or create one if none exists
    const firstStageId = workflow.stages[0]?.id;
    if (firstStageId) {
      onAddAgent(firstStageId, agentTemplate);
      setIsAgentSelectorOpen(false);
      toast({
        title: "Agent added",
        description: `${agent.name} has been added to the workflow`
      });
    } else {
      toast({
        title: "No stage available",
        description: "Please create a stage first",
        variant: "destructive"
      });
    }
  };

  // Filter functions based on search and category
  const filteredFunctions = FunctionRegistry.filter(
    functionCategory === "all" ? undefined : functionCategory,
    functionSearch
  );
  
  // Get unique categories for filter
  const categories = ["all", ...FunctionRegistry.getCategories()];
  return <div className="bg-card flex flex-col h-full">
      {isCollapsed && onToggleCollapse && (
        <div className="p-4 border-b border-border flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            title="Expand sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
          {/* Workflow Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="workflow-name" className="text-sm font-semibold text-foreground">
                Workflow Name
              </Label>
              {onToggleCollapse && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  className="h-7 w-7"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input id="workflow-name" placeholder="Untitled Workflow" value={workflowName} onChange={e => onWorkflowNameChange(e.target.value)} className="h-9" />
          </div>

          {/* Collapsible Sections */}
          <Accordion type="multiple" defaultValue={["prompt", "agents", "functions"]} className="space-y-2">
            {/* Input Section */}
            <AccordionItem value="prompt" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                Prompt
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <Card className="p-3 bg-muted/30">
                  <Textarea placeholder="Enter your initial prompt or paste text here..." className="min-h-[100px] resize-none border-0 bg-transparent focus-visible:ring-0" value={userInput} onChange={e => onUserInputChange(e.target.value)} />
                  <div className="flex gap-2 mt-3">
                    <input ref={fileUploadInputRef} type="file" accept=".txt,.md,.json,.xml,.csv,.yaml,.yml,.toml,.js,.jsx,.ts,.tsx,.vue,.html,.css,.scss,.sass,.py,.java,.c,.cpp,.cs,.go,.php,.rb,.sql,.sh,.log,.pdf,.docx,.xlsx,.xls" multiple className="hidden" onChange={handleFileUpload} />
                    <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => fileUploadInputRef.current?.click()} disabled={isProcessingFiles}>
                      <Upload className="h-3.5 w-3.5" />
                      {isProcessingFiles ? "Processing..." : "Upload Files"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={handleViewInput} disabled={!userInput} title="View/Edit Input">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={handleClearInput} disabled={!userInput} title="Clear Input">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Agent Templates */}
            <AccordionItem value="agents" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                <div className="flex items-center justify-between w-full pr-2">
                  <span>Agent Library</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAgentSelectorOpen(true);
                    }}
                    title="Select agent"
                  >
                    <Bot className="h-4 w-4" />
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-3">
                {/* Agent Search */}
                <Input 
                  placeholder="Search agents..." 
                  value={agentSearch} 
                  onChange={e => setAgentSearch(e.target.value)} 
                  className="h-8 text-xs" 
                />
                
                <div className="space-y-2">
                  {filteredAgents.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No agents found
                    </p>
                  ) : (
                    filteredAgents.map(agent => {
                  const IconComponent = iconMap[agent.iconName] || Bot;
                  const isCustom = customAgents.some(a => a.id === agent.id);
                  return <Card key={agent.id} className="p-3 cursor-move hover:shadow-md transition-shadow bg-gradient-to-br from-card to-muted/20 group" draggable onDragStart={e => handleDragStart(e, agent)}>
                        <div className="flex items-start gap-3">
                          {agent.profile_picture_url ? (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={agent.profile_picture_url} />
                              <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <IconComponent className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-foreground">{agent.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={e => {
                          e.stopPropagation();
                          handleDownloadAgent(agent);
                        }} title="Download agent">
                              <Download className="h-3 w-3" />
                            </Button>
                            {isCustom && <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={e => {
                          e.stopPropagation();
                          handleDeleteAgent(agent.id);
                        }} title="Delete agent">
                                <Trash2 className="h-3 w-3" />
                              </Button>}
                          </div>
                        </div>
                      </Card>;
                    })
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Tools Library - Now replaced with Functions */}
            <AccordionItem value="functions" className="border rounded-lg px-4" data-section="functions">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                Functions Library
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-3">
                {/* Search and Filter */}
                <div className="space-y-2">
                  <Input placeholder="Search functions..." value={functionSearch} onChange={e => setFunctionSearch(e.target.value)} className="h-8 text-xs" />
                  <Select value={functionCategory} onValueChange={setFunctionCategory}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat} value={cat} className="text-xs">
                          {cat === "all" ? "All Categories" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Functions List */}
                <div className="space-y-2">
                  {filteredFunctions.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">
                      No functions found
                    </p> : filteredFunctions.map(func => {
                  const FuncIcon = func.icon;
                  return <Card key={func.id} className="p-2.5 cursor-move hover:shadow-md transition-all bg-gradient-to-br from-card to-muted/10" draggable onDragStart={e => handleDragStart(e, func, "function")}>
                          <div className="flex items-start gap-2.5">
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${func.color}`}>
                              <FuncIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-medium text-foreground">{func.name}</h4>
                                {func.outputs.length > 1 && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                    {func.outputs.length} outputs
                                  </Badge>}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                                {func.description}
                              </p>
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 mt-1">
                                {func.category}
                              </Badge>
                            </div>
                          </div>
                        </Card>;
                })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          </div>
        </ScrollArea>
      )}
      
      {/* View/Edit Input Modal */}
      <Dialog open={isViewInputOpen} onOpenChange={setIsViewInputOpen}>
        <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>View / Edit Input</DialogTitle>
          </DialogHeader>
          <Tabs value={inputTab} onValueChange={setInputTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start mb-4">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="view">View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <Textarea 
                  value={editedInput} 
                  onChange={e => setEditedInput(e.target.value)} 
                  className="min-h-[calc(90vh-270px)] font-mono text-xs resize-none w-full" 
                  placeholder="No input text..." 
                />
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="view" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <div className="prose prose-sm dark:prose-invert max-w-none p-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <Table className="my-4">
                          {children}
                        </Table>
                      ),
                      thead: ({ children }) => <TableHeader>{children}</TableHeader>,
                      tbody: ({ children }) => <TableBody>{children}</TableBody>,
                      tr: ({ children }) => <TableRow>{children}</TableRow>,
                      th: ({ children }) => (
                        <TableHead className="font-bold">{children}</TableHead>
                      ),
                      td: ({ children }) => <TableCell>{children}</TableCell>,
                      code: ({ inline, children, ...props }: any) => {
                        return inline ? (
                          <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>
                            {children}
                          </code>
                        ) : (
                          <pre className="bg-muted p-3 rounded-md overflow-x-auto my-2">
                            <code className="text-xs font-mono" {...props}>
                              {children}
                            </code>
                          </pre>
                        );
                      },
                    }}
                  >
                    {editedInput}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setIsViewInputOpen(false);
              setInputTab("edit");
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleSaveEditedInput();
              setInputTab("edit");
            }}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Excel Selector Modal */}
      {excelData && <ExcelSelector excelData={excelData} onClose={handleExcelClose} onSelect={handleExcelSelect} />}
      
      {/* Agent Selector Dialog */}
      <AgentSelectorDialog
        open={isAgentSelectorOpen}
        onOpenChange={setIsAgentSelectorOpen}
        onSelectAgent={handleAgentSelect}
      />
    </div>;
};