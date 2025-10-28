import { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
        <div className="p-4">
          <Accordion type="multiple" defaultValue={["section-0", "section-1", "section-2"]}>
            {children}
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
};

interface PageSidebarSectionProps {
  title?: string;
  children: ReactNode;
  value?: string;
}

export const PageSidebarSection = ({ title, children, value }: PageSidebarSectionProps) => {
  if (!value) {
    value = `section-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  return (
    <AccordionItem value={value} className="border rounded-lg px-4 mb-2">
      <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
        {title || "Section"}
      </AccordionTrigger>
      <AccordionContent className="pb-4 space-y-3">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
};
