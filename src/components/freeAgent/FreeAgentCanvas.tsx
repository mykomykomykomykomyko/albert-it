import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToolDefinition, toolDefinitions } from '@/lib/toolDefinitions';
import { cn } from '@/lib/utils';
import { Bot, Zap } from 'lucide-react';

interface FreeAgentCanvasProps {
  activeTools: string[];
  usedTools: string[];
  currentTool?: string;
  isRunning: boolean;
  iteration: number;
}

// Tool categories with colors
const toolCategories: Record<string, { color: string; label: string }> = {
  information: { color: 'hsl(210, 100%, 60%)', label: 'Information' },
  search: { color: 'hsl(280, 80%, 60%)', label: 'Search' },
  analysis: { color: 'hsl(160, 80%, 45%)', label: 'Analysis' },
  code: { color: 'hsl(45, 100%, 50%)', label: 'Code' },
  document: { color: 'hsl(340, 80%, 55%)', label: 'Document' },
  communication: { color: 'hsl(200, 90%, 50%)', label: 'Communication' },
  memory: { color: 'hsl(120, 60%, 50%)', label: 'Memory' },
  reasoning: { color: 'hsl(30, 90%, 55%)', label: 'Reasoning' },
  utility: { color: 'hsl(0, 0%, 60%)', label: 'Utility' },
};

// Categorize tools
const categorizeTools = (tools: ToolDefinition[]): Record<string, ToolDefinition[]> => {
  const categories: Record<string, ToolDefinition[]> = {};
  
  tools.forEach(tool => {
    // Determine category based on tool name
    let category = 'utility';
    if (['time', 'weather'].includes(tool.name)) category = 'information';
    if (['web_search', 'brave_search', 'google_search', 'perplexity_search', 'read_github_repo', 'read_github_file'].includes(tool.name)) category = 'search';
    if (['analyze', 'summarize', 'think', 'ocr_image'].includes(tool.name)) category = 'analysis';
    if (['execute_javascript', 'execute_sql', 'api_call'].includes(tool.name)) category = 'code';
    if (['pdf_extract_text', 'pdf_info', 'read_zip_contents', 'read_zip_file', 'extract_zip_files', 'export_word', 'export_pdf'].includes(tool.name)) category = 'document';
    if (['send_email', 'elevenlabs_tts'].includes(tool.name)) category = 'communication';
    if (['read_blackboard', 'write_blackboard', 'read_scratchpad', 'write_scratchpad', 'read_named_attribute', 'write_named_attribute'].includes(tool.name)) category = 'memory';
    if (['read_database_schemas'].includes(tool.name)) category = 'code';
    
    if (!categories[category]) categories[category] = [];
    categories[category].push(tool);
  });
  
  return categories;
};

export const FreeAgentCanvas: React.FC<FreeAgentCanvasProps> = ({
  activeTools,
  usedTools,
  currentTool,
  isRunning,
  iteration,
}) => {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  
  const categorizedTools = useMemo(() => categorizeTools(toolDefinitions), []);
  const categoryList = Object.entries(categorizedTools);
  
  // Calculate positions for concentric arcs
  const centerX = 200;
  const centerY = 200;
  const baseRadius = 80;
  const radiusStep = 50;
  
  const getToolPosition = (categoryIndex: number, toolIndex: number, totalTools: number) => {
    const radius = baseRadius + (categoryIndex * radiusStep);
    const angleStep = (Math.PI * 1.5) / Math.max(totalTools, 1);
    const startAngle = -Math.PI * 0.75;
    const angle = startAngle + (toolIndex * angleStep);
    
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      angle,
    };
  };

  return (
    <Card className="relative w-full aspect-square max-w-[500px] mx-auto overflow-hidden bg-gradient-to-br from-background to-muted/30">
      <svg 
        viewBox="0 0 400 400" 
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}
      >
        {/* Background circles */}
        {categoryList.map((_, idx) => (
          <circle
            key={`ring-${idx}`}
            cx={centerX}
            cy={centerY}
            r={baseRadius + idx * radiusStep}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={0.5}
          />
        ))}
        
        {/* Connection lines from center to active tools */}
        {categoryList.map(([category, tools], catIdx) => 
          tools.map((tool, toolIdx) => {
            const pos = getToolPosition(catIdx, toolIdx, tools.length);
            const isActive = activeTools.includes(tool.name);
            const isUsed = usedTools.includes(tool.name);
            const isCurrent = currentTool === tool.name;
            
            if (!isActive && !isUsed) return null;
            
            return (
              <line
                key={`line-${tool.name}`}
                x1={centerX}
                y1={centerY}
                x2={pos.x}
                y2={pos.y}
                stroke={toolCategories[category]?.color || 'hsl(var(--primary))'}
                strokeWidth={isCurrent ? 3 : 1.5}
                opacity={isCurrent ? 1 : 0.4}
                className={cn(isCurrent && "animate-pulse")}
              />
            );
          })
        )}
        
        {/* Tool nodes */}
        <TooltipProvider>
          {categoryList.map(([category, tools], catIdx) => 
            tools.map((tool, toolIdx) => {
              const pos = getToolPosition(catIdx, toolIdx, tools.length);
              const isActive = activeTools.includes(tool.name);
              const isUsed = usedTools.includes(tool.name);
              const isCurrent = currentTool === tool.name;
              const isHovered = hoveredTool === tool.name;
              const categoryColor = toolCategories[category]?.color || 'hsl(var(--muted))';
              
              return (
                <Tooltip key={tool.name}>
                  <TooltipTrigger asChild>
                    <g
                      onMouseEnter={() => setHoveredTool(tool.name)}
                      onMouseLeave={() => setHoveredTool(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Outer glow for current tool */}
                      {isCurrent && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={18}
                          fill={categoryColor}
                          opacity={0.3}
                          className="animate-ping"
                        />
                      )}
                      
                      {/* Tool node */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isHovered ? 14 : 12}
                        fill={isActive || isUsed ? categoryColor : 'hsl(var(--muted))'}
                        stroke={isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                        strokeWidth={isCurrent ? 3 : 1.5}
                        opacity={isActive ? 1 : isUsed ? 0.7 : 0.4}
                        className="transition-all duration-200"
                      />
                      
                      {/* Tool icon placeholder */}
                      <text
                        x={pos.x}
                        y={pos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="8"
                        fill="white"
                        fontWeight="bold"
                      >
                        {tool.name.slice(0, 2).toUpperCase()}
                      </text>
                    </g>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{tool.name}</p>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: categoryColor, color: categoryColor }}
                        >
                          {toolCategories[category]?.label || category}
                        </Badge>
                        {isUsed && (
                          <Badge variant="secondary" className="text-xs">Used</Badge>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })
          )}
        </TooltipProvider>
        
        {/* Central agent node */}
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r={35}
            fill="hsl(var(--primary))"
            className={cn(isRunning && "animate-pulse")}
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={35}
            fill="none"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="2"
            opacity={0.3}
          />
          
          {/* Agent icon */}
          <Bot
            x={centerX - 12}
            y={centerY - 12}
            width={24}
            height={24}
            color="hsl(var(--primary-foreground))"
          />
        </g>
        
        {/* Iteration indicator */}
        {isRunning && (
          <g>
            <circle
              cx={centerX}
              cy={centerY}
              r={45}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeDasharray={`${(iteration / 100) * 283} 283`}
              transform={`rotate(-90 ${centerX} ${centerY})`}
              className="transition-all duration-300"
            />
          </g>
        )}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 justify-center">
        {Object.entries(toolCategories).slice(0, 5).map(([key, { color, label }]) => (
          <Badge
            key={key}
            variant="outline"
            className="text-xs px-1.5 py-0"
            style={{ borderColor: color, color }}
          >
            {label}
          </Badge>
        ))}
      </div>
      
      {/* Status indicator */}
      {isRunning && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-medium">Iteration {iteration}</span>
        </div>
      )}
    </Card>
  );
};
