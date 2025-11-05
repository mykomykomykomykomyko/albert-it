/**
 * Persistent Pages Container
 * 
 * This component renders all main application pages simultaneously and uses
 * CSS display:none to hide inactive pages instead of unmounting them.
 * This preserves component state when users navigate between tabs.
 * 
 * Similar to Vue's v-show vs v-if pattern.
 */

import { useLocation } from "react-router-dom";
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

export const PersistentPages = () => {
  const location = useLocation();
  const path = location.pathname;

  // Helper to determine if a path matches
  const isActive = (route: string) => path.startsWith(route);

  return (
    <>
      {/* Chat - /chat, /chat/:id */}
      <div 
        style={{ 
          display: isActive('/chat') && !path.includes('/shared/') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <EnhancedChat />
      </div>

      {/* Canvas - /canvas */}
      <div 
        style={{ 
          display: isActive('/canvas') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <Canvas />
      </div>

      {/* Stage - /stage */}
      <div 
        style={{ 
          display: isActive('/stage') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <Stage />
      </div>

      {/* Image Analysis - /image */}
      <div 
        style={{ 
          display: isActive('/image') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <ImageAnalysis />
      </div>

      {/* Voice Analysis - /voice */}
      <div 
        style={{ 
          display: isActive('/voice') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <VoiceAnalysis />
      </div>

      {/* Meeting Transcripts - /transcripts */}
      <div 
        style={{ 
          display: isActive('/transcripts') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <MeetingTranscripts />
      </div>

      {/* Agents - /agents */}
      <div 
        style={{ 
          display: isActive('/agents') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <Agents />
      </div>

      {/* Agent Marketplace - /marketplace */}
      <div 
        style={{ 
          display: isActive('/marketplace') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <AgentMarketplace />
      </div>

      {/* Prompt Library - /prompts */}
      <div 
        style={{ 
          display: isActive('/prompts') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <PromptLibrary />
      </div>

      {/* Framework - /framework */}
      <div 
        style={{ 
          display: isActive('/framework') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <Framework />
      </div>

      {/* Workflow Marketplace - /workflow-marketplace */}
      <div 
        style={{ 
          display: isActive('/workflow-marketplace') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <WorkflowMarketplace />
      </div>

      {/* Saved Work - /saved-work */}
      <div 
        style={{ 
          display: isActive('/saved-work') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <SavedWork />
      </div>

      {/* Docs - /docs */}
      <div 
        style={{ 
          display: isActive('/docs') ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          width: '100%'
        }}
      >
        <Docs />
      </div>
    </>
  );
};
