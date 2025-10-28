/**
 * StandardAppLayout with Header
 * Alternative layout that includes ChatHeader inside, for pages that need it
 */
import { ReactNode } from "react";
import { ChatHeader } from "@/components/ChatHeader";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface StandardAppLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showSidebar?: boolean;
  defaultCollapsed?: boolean;
}

export const StandardAppLayout = ({ 
  children, 
  sidebar, 
  showSidebar = true,
  defaultCollapsed = false 
}: StandardAppLayoutProps) => {
  if (!showSidebar || !sidebar) {
    // No sidebar mode
    return (
      <div className="flex flex-col h-screen w-full bg-background">
        <ChatHeader />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={!defaultCollapsed}>
      <div className="flex flex-col h-screen w-full bg-background">
        {/* Header with integrated sidebar trigger */}
        <div className="border-b border-border flex-shrink-0">
          <div className="flex items-center h-16">
            <SidebarTrigger className="ml-4" />
            <div className="flex-1">
              <ChatHeader />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden w-full">
          <StandardAppLayoutSidebar>{sidebar}</StandardAppLayoutSidebar>
          
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const StandardAppLayoutSidebar = ({ children }: { children: ReactNode }) => {
  const { open } = useSidebar();
  
  return (
    <Sidebar
      className={cn(
        "transition-all duration-300 border-r border-border",
        open ? "w-80" : "w-0"
      )}
      collapsible="offcanvas"
    >
      <SidebarContent className="overflow-y-auto">
        {children}
      </SidebarContent>
    </Sidebar>
  );
};
