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
      <div className="flex min-h-screen w-full bg-background">
        <AppLayoutSidebar>{sidebar}</AppLayoutSidebar>
        
        <div className="flex flex-col flex-1 min-w-0">
          {/* Global Header with Sidebar Trigger */}
          <div className="sticky top-0 z-10 bg-background border-b border-border">
            <div className="flex items-center h-14 px-4 gap-2">
              <SidebarTrigger />
              <div className="flex-1">
                <ChatHeader />
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const AppLayoutSidebar = ({ children }: { children: ReactNode }) => {
  return (
    <Sidebar
      className="border-r border-border"
      collapsible="icon"
    >
      <SidebarContent className="overflow-y-auto">
        {children}
      </SidebarContent>
    </Sidebar>
  );
};
