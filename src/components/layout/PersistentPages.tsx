/**
 * Persistent Pages Container
 * 
 * This component renders all main application pages simultaneously and uses
 * CSS display:none to hide inactive pages instead of unmounting them.
 * This preserves component state when users navigate between tabs.
 * 
 * Similar to Vue's v-show vs v-if pattern.
 * 
 * Phase 3 Optimizations:
 * - Lazy initialization: Pages only initialize on first visit
 * - Memory management: All pages stay mounted for instant switching
 * - Proper layout structure: Each page has flex container for display:none
 */

import { useLocation } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import EnhancedChat from "@/components/Chat";
import Canvas from "@/pages/Canvas";
import Stage from "@/pages/Stage";
import ImageAnalysis from "@/pages/ImageAnalysis";
import VoiceAnalysis from "@/pages/VoiceAnalysis";
import MeetingTranscripts from "@/pages/MeetingTranscripts";
import Agents from "@/pages/Agents";
import AgentMarketplace from "@/pages/AgentMarketplace";
import PromptLibrary from "@/pages/PromptLibrary";
import Framework from "@/pages/Framework";
import WorkflowMarketplace from "@/pages/WorkflowMarketplace";
import SavedWork from "@/pages/SavedWork";
import Docs from "@/pages/Docs";
import FileManager from "@/pages/FileManager";

export const PersistentPages = () => {
  const location = useLocation();
  const path = location.pathname;
  
  // Track which pages have been visited for lazy initialization
  const [visitedPages, setVisitedPages] = useState<Set<string>>(() => new Set());

  // Helper to determine if a path matches
  const isActive = (route: string) => path.startsWith(route);
  
  // Mark page as visited when it becomes active
  useEffect(() => {
    const routes = ['/chat', '/canvas', '/stage', '/image', '/voice', '/transcripts', 
                    '/agents', '/marketplace', '/prompts', '/framework', 
                    '/workflow-marketplace', '/saved-work', '/files', '/docs'];
    
    const currentRoute = routes.find(route => path.startsWith(route));
    if (currentRoute && !visitedPages.has(currentRoute)) {
      setVisitedPages(prev => new Set([...prev, currentRoute]));
    }
  }, [path, visitedPages]);
  
  // Check if a page should render (visited at least once)
  const shouldRender = (route: string) => visitedPages.has(route);

  return (
    <>
      {/* Chat - /chat, /chat/:id */}
      {shouldRender('/chat') && (
        <div 
          style={{ 
            display: isActive('/chat') && !path.includes('/shared/') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <EnhancedChat />
        </div>
      )}

      {/* Canvas - /canvas */}
      {shouldRender('/canvas') && (
        <div 
          style={{ 
            display: isActive('/canvas') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <Canvas />
        </div>
      )}

      {/* Stage - /stage */}
      {shouldRender('/stage') && (
        <div 
          style={{ 
            display: isActive('/stage') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <Stage />
        </div>
      )}

      {/* Image Analysis - /image */}
      {shouldRender('/image') && (
        <div 
          style={{ 
            display: isActive('/image') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <ImageAnalysis />
        </div>
      )}

      {/* Voice Analysis - /voice */}
      {shouldRender('/voice') && (
        <div 
          style={{ 
            display: isActive('/voice') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <VoiceAnalysis />
        </div>
      )}

      {/* Meeting Transcripts - /transcripts */}
      {shouldRender('/transcripts') && (
        <div 
          style={{ 
            display: isActive('/transcripts') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <MeetingTranscripts />
        </div>
      )}

      {/* Agents - /agents */}
      {shouldRender('/agents') && (
        <div 
          style={{ 
            display: isActive('/agents') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <Agents />
        </div>
      )}

      {/* Agent Marketplace - /marketplace */}
      {shouldRender('/marketplace') && (
        <div 
          style={{ 
            display: isActive('/marketplace') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <AgentMarketplace />
        </div>
      )}

      {/* Prompt Library - /prompts */}
      {shouldRender('/prompts') && (
        <div 
          style={{ 
            display: isActive('/prompts') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <PromptLibrary />
        </div>
      )}

      {/* Framework - /framework */}
      {shouldRender('/framework') && (
        <div 
          style={{ 
            display: isActive('/framework') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <Framework />
        </div>
      )}

      {/* Workflow Marketplace - /workflow-marketplace */}
      {shouldRender('/workflow-marketplace') && (
        <div 
          style={{ 
            display: isActive('/workflow-marketplace') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <WorkflowMarketplace />
        </div>
      )}

      {/* Saved Work - /saved-work */}
      {shouldRender('/saved-work') && (
        <div 
          style={{ 
            display: isActive('/saved-work') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <SavedWork />
        </div>
      )}

      {/* Docs - /docs */}
      {shouldRender('/docs') && (
        <div 
          style={{ 
            display: isActive('/docs') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <Docs />
        </div>
      )}

      {/* File Manager - /files */}
      {shouldRender('/files') && (
        <div 
          style={{ 
            display: isActive('/files') ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <FileManager />
        </div>
      )}
    </>
  );
};
