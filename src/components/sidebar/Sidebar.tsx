import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Search, FileText, Bot, Plus, Download, Trash2, X, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import type { Workflow } from "@/types/workflow";
import { useTranslation } from "react-i18next";

// Icon mapping for serialization
const iconMap: Record<string, LucideIcon> = {
  Search,
  FileText,
  Bot
};

const agentTemplates = [
  {
    id: "researcher",
    name: "Researcher",
    iconName: "Search",
    description: "Gather and analyze information",
    defaultSystemPrompt: "You are a research assistant specializing in gathering and analyzing information from various sources.",
    defaultUserPrompt: "Research the following topic and provide detailed findings: {input}"
  },
  {
    id: "summarizer",
    name: "Summarizer",
    iconName: "FileText",
    description: "Condense long content",
    defaultSystemPrompt: "You are a summarization expert who creates concise, accurate summaries of long content.",
    defaultUserPrompt: "Summarize the following content: {input}"
  },
  {
    id: "analyst",
    name: "Analyst",
    iconName: "Bot",
    description: "Deep data analysis",
    defaultSystemPrompt: "You are a data analyst who provides insightful analysis and identifies patterns in data.",
    defaultUserPrompt: "Analyze the following data and provide insights: {input}"
  }
];

const tools = [
  { id: "google_search", name: "Google Search", icon: Search, description: "Search the web for information", requiresApiKey: true },
  { id: "weather", name: "Weather", icon: Search, description: "Get weather information", requiresApiKey: true },
  { id: "time", name: "Time", icon: Search, description: "Get current time", requiresApiKey: false },
  { id: "api_call", name: "API Call", icon: Search, description: "Make custom API calls", requiresApiKey: true },
  { id: "web_scrape", name: "Web Scrape", icon: Search, description: "Scrape web pages", requiresApiKey: false }
];

interface SidebarProps {
  onAddAgent: (stageId: string, agentTemplate: any) => void;
  onAddNode: (stageId: string, template: any, nodeType: "agent" | "function" | "tool") => void;
  workflow: Workflow;
  userInput: string;
  onUserInputChange: (input: string) => void;
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  customAgents: any[];
  onCustomAgentsChange: (agents: any[]) => void;
}

export const Sidebar = ({
  workflow,
  userInput,
  onUserInputChange,
  workflowName,
  onWorkflowNameChange,
}: SidebarProps) => {
  const { t } = useTranslation('stage');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const categories = ["all", ...FunctionRegistry.getCategories()];
  
  const filteredFunctions = FunctionRegistry.filter(
    selectedCategory === "all" ? undefined : selectedCategory,
    searchQuery
  ).filter(func => {
    const matchesSearch = func.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      func.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || func.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDragStart = (e: React.DragEvent, template: any, nodeType: "agent" | "function" | "tool" = "agent") => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("agentTemplate", JSON.stringify(template));
    e.dataTransfer.setData("nodeType", nodeType);
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Workflow meta (now scrollable) */}
          <div className="space-y-4 border-b border-border pb-4">
            <div>
              <Label htmlFor="workflow-name" className="text-sm font-medium">{t('sidebar.workflowName')}</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(e) => onWorkflowNameChange(e.target.value)}
                placeholder={t('sidebar.myWorkflow')}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="user-input" className="text-sm font-medium">{t('sidebar.initialInput')}</Label>
              <Textarea
                id="user-input"
                value={userInput}
                onChange={(e) => onUserInputChange(e.target.value)}
                placeholder={t('sidebar.initialInputPlaceholder')}
                className="mt-1.5 min-h-[100px] resize-none"
              />
            </div>
          </div>

          {/* Library content */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Bot className="h-4 w-4" />
              {t('sidebar.agentTemplates')}
            </h3>
            <div className="space-y-2">
              {agentTemplates.map((template) => {
                const IconComponent = iconMap[template.iconName] || Bot;
                return (
                  <Card
                    key={template.id}
                    className="p-3 cursor-move hover:border-primary transition-colors"
                    draggable
                    onDragStart={(e) => handleDragStart(e, template, "agent")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground">{template.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">{t('sidebar.functions')}</h3>
            <div className="space-y-3 mb-4">
              <Input
                placeholder={t('sidebar.searchFunctions')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {filteredFunctions.map((func) => {
                const IconComponent = func.icon;
                return (
                  <Card
                    key={func.id}
                    className="p-3 cursor-move hover:border-primary transition-colors"
                    draggable
                    onDragStart={(e) => handleDragStart(e, func, "function")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground">{func.name}</h4>
                          <Badge variant="secondary" className="text-xs">{func.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{func.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
