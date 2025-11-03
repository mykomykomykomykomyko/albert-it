import { ReactNode, useState } from "react";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";

interface ResponsiveLayoutProps {
  sidebar: ReactNode;
  mobileCanvas: ReactNode;
  desktopCanvas: ReactNode;
  properties: ReactNode;
  propertiesPanelOpen: boolean;
  sidebarCollapsed: boolean;
  onAddStage: () => void;
  onRun: () => void;
  onSave: () => void;
  onLoad: (file: File) => void;
  onClear: () => void;
  hasSelectedAgent: boolean;
}

export const ResponsiveLayout = ({
  sidebar,
  mobileCanvas,
  desktopCanvas,
  properties,
  propertiesPanelOpen,
  sidebarCollapsed,
  onAddStage,
  onRun,
  onSave,
  onLoad,
  onClear,
  hasSelectedAgent,
}: ResponsiveLayoutProps) => {
  const [mobileTab, setMobileTab] = useState<"library" | "workflow" | "properties">("workflow");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col flex-1 overflow-hidden">
        <MobileNav
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          onAddStage={onAddStage}
          onRun={onRun}
          onSave={onSave}
          onLoad={onLoad}
          onClear={onClear}
          hasSelectedAgent={hasSelectedAgent}
        />
        
        <div className="flex-1 overflow-hidden">
          <div
            className={cn(
              "h-full",
              mobileTab !== "library" && "hidden"
            )}
          >
            {sidebar}
          </div>
          <div
            className={cn(
              "h-full overflow-hidden",
              mobileTab !== "workflow" && "hidden"
            )}
          >
            {mobileCanvas}
          </div>
          <div
            className={cn(
              "h-full overflow-y-auto",
              mobileTab !== "properties" && "hidden"
            )}
          >
            {properties}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden w-full">
        <div className={`flex-shrink-0 border-r border-border overflow-y-auto bg-card transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-80'}`}>
          {sidebar}
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {desktopCanvas}
        </div>
        
        {propertiesPanelOpen && (
          <div className="w-80 xl:w-96 flex-shrink-0 border-l border-border overflow-y-auto bg-card">
            {properties}
          </div>
        )}
      </div>
    </div>
  );
};