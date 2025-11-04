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
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Top Navigation - Full Width */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <ChatHeader />
      </div>

      {/* Sidebar + Content Area Below Header */}
      <div className="flex flex-1 overflow-hidden">
        <SidebarProvider defaultOpen={!defaultCollapsed}>
          <div className="flex w-full">
            <AppLayoutSidebar>{sidebar}</AppLayoutSidebar>
            
            <div className="flex flex-col flex-1 min-w-0">
              {/* Sidebar Trigger in Content Area */}
              <div className="sticky top-0 z-10 bg-background border-b border-border h-12 flex items-center px-4">
                <SidebarTrigger />
              </div>

              {/* Main Content Area */}
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </div>
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
