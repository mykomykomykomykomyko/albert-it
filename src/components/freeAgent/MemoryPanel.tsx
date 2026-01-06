import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Clipboard, 
  FileText, 
  Tag, 
  Brain,
  Lightbulb,
  Target,
  CheckCircle,
  AlertCircle,
  Package,
  HelpCircle,
  MessageCircle,
  Database,
  TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BlackboardEntry, Scratchpad, NamedAttribute, BlackboardEntryType } from '@/types/freeAgent';
import { cn } from '@/lib/utils';

interface MemoryPanelProps {
  blackboard: BlackboardEntry[];
  scratchpad: Scratchpad | null;
  attributes: NamedAttribute[];
}

const entryTypeIcons: Record<BlackboardEntryType, React.ReactNode> = {
  observation: <Brain className="h-3.5 w-3.5" />,
  insight: <Lightbulb className="h-3.5 w-3.5" />,
  plan: <Target className="h-3.5 w-3.5" />,
  decision: <CheckCircle className="h-3.5 w-3.5" />,
  error: <AlertCircle className="h-3.5 w-3.5" />,
  artifact: <Package className="h-3.5 w-3.5" />,
  question: <HelpCircle className="h-3.5 w-3.5" />,
  answer: <MessageCircle className="h-3.5 w-3.5" />,
  memory: <Database className="h-3.5 w-3.5" />,
  progress: <TrendingUp className="h-3.5 w-3.5" />,
};

const entryTypeColors: Record<BlackboardEntryType, string> = {
  observation: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  insight: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  plan: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  decision: 'bg-green-500/20 text-green-600 dark:text-green-400',
  error: 'bg-red-500/20 text-red-600 dark:text-red-400',
  artifact: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
  question: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  answer: 'bg-teal-500/20 text-teal-600 dark:text-teal-400',
  memory: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  progress: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
};

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  blackboard,
  scratchpad,
  attributes,
}) => {
  const { t } = useTranslation('freeAgent');

  return (
    <Tabs defaultValue="blackboard" className="w-full">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="blackboard" className="flex items-center gap-1.5">
          <Clipboard className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('memory.blackboard', 'Blackboard')}</span>
          {blackboard.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {blackboard.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="scratchpad" className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('memory.scratchpad', 'Scratchpad')}</span>
        </TabsTrigger>
        <TabsTrigger value="attributes" className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('memory.attributes', 'Attributes')}</span>
          {attributes.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {attributes.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="blackboard" className="mt-3">
        <ScrollArea className="h-[300px]">
          {blackboard.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t('memory.emptyBlackboard', 'No entries yet')}
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {blackboard.map((entry) => (
                <Card 
                  key={entry.id} 
                  className="p-3 border-l-4"
                  style={{ borderLeftColor: `hsl(var(--${entry.type === 'error' ? 'destructive' : 'primary'}))` }}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full shrink-0",
                      entryTypeColors[entry.type]
                    )}>
                      {entryTypeIcons[entry.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {entry.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Iter {entry.iteration}
                        </span>
                      </div>
                      <p className="text-sm break-words">{entry.content}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="scratchpad" className="mt-3">
        <ScrollArea className="h-[300px]">
          <div className="space-y-3 pr-4">
            <Card className="p-3">
              <h4 className="text-sm font-medium mb-2">{t('memory.workingMemory', 'Working Memory')}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {scratchpad?.content || t('memory.empty', 'Empty')}
              </p>
              {scratchpad && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Version {scratchpad.version} • Last updated: {new Date(scratchpad.lastUpdated).toLocaleTimeString()}
                </div>
              )}
            </Card>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="attributes" className="mt-3">
        <ScrollArea className="h-[300px]">
          {attributes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t('memory.emptyAttributes', 'No attributes yet')}
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {attributes.map((attr) => (
                <Card key={attr.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="font-mono">
                      {attr.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {attr.toolName && `via ${attr.toolName}`}
                    </span>
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {typeof attr.value === 'string' 
                      ? attr.value 
                      : JSON.stringify(attr.value, null, 2)}
                  </pre>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};
