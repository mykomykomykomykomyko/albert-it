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

interface AppLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  defaultCollapsed?: boolean;
}

export const AppLayout = ({ children, sidebar, defaultCollapsed = false }: AppLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={!defaultCollapsed}>
      <div className="flex flex-col h-screen w-full bg-background">
        {/* Global Header with Sidebar Trigger */}
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
          <AppLayoutSidebar>{sidebar}</AppLayoutSidebar>
          
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const AppLayoutSidebar = ({ children }: { children: ReactNode }) => {
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
