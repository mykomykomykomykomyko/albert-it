import { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface PageSidebarProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export const PageSidebar = ({ title, description, children }: PageSidebarProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-shrink-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {children}
        </div>
      </ScrollArea>
    </div>
  );
};

interface PageSidebarSectionProps {
  title?: string;
  children: ReactNode;
}

export const PageSidebarSection = ({ title, children }: PageSidebarSectionProps) => {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-medium">{title}</h3>}
      {children}
    </div>
  );
};
