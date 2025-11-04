import { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface PageSidebarProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export const PageSidebar = ({ title, description, children }: PageSidebarProps) => {
  return (
    <div className="flex flex-col h-full pt-4">
      <div className="p-6 flex-shrink-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {children}
        </div>
      </ScrollArea>
    </div>
  );
};

interface PageSidebarSectionProps {
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export const PageSidebarSection = ({ title, children, defaultOpen = true }: PageSidebarSectionProps) => {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border rounded-lg px-4">
      <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium py-3 hover:opacity-80 transition-opacity">
        {title || "Section"}
        <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-4 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};
