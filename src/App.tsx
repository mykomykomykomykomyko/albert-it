/**
 * Main Application Component
 * 
 * This is the root component of Albert AI Assistant Platform.
 * It sets up the application-wide providers and routing structure.
 * 
 * Architecture:
 * - QueryClientProvider: Manages server state and caching with TanStack Query
 * - TooltipProvider: Provides tooltip context for Radix UI components
 * - BrowserRouter: Enables client-side routing with React Router
 * - Routes: Defines all application routes
 * - GlobalHelperAgent: Provides context-aware help on any page
 * 
 * Routes:
 * - / : Root redirect (checks auth, sends to /chat or /landing)
 * - /landing : Public landing page
 * - /auth : Authentication page (login/signup)
 * - /agents : Agent management interface
 * - /marketplace : Browse and discover community agents
 * - /prompts : Prompt library and management
 * - /framework : Framework management for prompts
 * - /admin/review : Admin panel for reviewing submissions
 * - /workflow-marketplace : Browse and share workflows
 * - /chat : Main chat interface with AI
 * - /chat/:id : Specific conversation view
 * - /stage : Stage workflow builder (sequential pipelines)
 * - /canvas : Canvas workflow builder (complex workflows)
 * - /image : Image analysis tool
 * - /voice : Voice processing (STT/TTS)
 * - /transcripts : Meeting transcript analysis
 * - * : 404 Not Found page (catch-all)
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Agents from "./pages/Agents";
import AgentMarketplace from "./pages/AgentMarketplace";
import PromptLibrary from "./pages/PromptLibrary";
import Framework from "./pages/Framework";
import AdminReview from "./pages/AdminReview";
import WorkflowMarketplace from "./pages/WorkflowMarketplace";
import EnhancedChat from "./components/Chat";
import Stage from "./pages/Stage";
import Canvas from "./pages/Canvas";
import ImageAnalysis from "./pages/ImageAnalysis";
import VoiceAnalysis from "./pages/VoiceAnalysis";
import MeetingTranscripts from "./pages/MeetingTranscripts";
import Docs from "./pages/Docs";
import NotFound from "./pages/NotFound";
import { GlobalHelperAgent } from "./components/GlobalHelperAgent";
import { AccessibilityProvider } from "./components/AccessibilityProvider";
import { AccessibilityPreferences } from "./components/AccessibilityPreferences";

/**
 * React Query Client Configuration
 * Handles server state management, caching, and automatic refetching
 */
const queryClient = new QueryClient();

/**
 * App Component
 * Root component that wraps the entire application with necessary providers
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AccessibilityProvider>
        {/* Toast notifications for user feedback */}
        <Toaster />
        <Sonner />
      
      <BrowserRouter>
        <Routes>
          {/* Root route - handles authentication-based redirects */}
          <Route path="/" element={<Index />} />
          
          {/* Public routes */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Agent management routes */}
          <Route path="/agents" element={<Agents />} />
          <Route path="/marketplace" element={<AgentMarketplace />} />
          
          {/* Prompt and framework management */}
          <Route path="/prompts" element={<PromptLibrary />} />
          <Route path="/framework" element={<Framework />} />
          
          {/* Admin routes */}
          <Route path="/admin/review" element={<AdminReview />} />
          
          {/* Workflow routes */}
          <Route path="/workflow-marketplace" element={<WorkflowMarketplace />} />
          
          {/* Chat routes */}
          <Route path="/chat" element={<EnhancedChat />} />
          <Route path="/chat/:id" element={<EnhancedChat />} />
          
          {/* Workflow builder routes */}
          <Route path="/stage" element={<Stage />} />
          <Route path="/canvas" element={<Canvas />} />
          
          {/* Analysis tools */}
          <Route path="/image" element={<ImageAnalysis />} />
          <Route path="/voice" element={<VoiceAnalysis />} />
          <Route path="/transcripts" element={<MeetingTranscripts />} />
          
          {/* Documentation */}
          <Route path="/docs" element={<Docs />} />
          
          {/* Catch-all route for 404 errors */}
          {/* ⚠️ IMPORTANT: Keep this as the last route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        {/* Global Helper Agent - Accessible via ? button on all pages */}
        <GlobalHelperAgent />
        
        {/* Accessibility Preferences - Settings button for UI/UX customization */}
        <AccessibilityPreferences />
      </BrowserRouter>
      </AccessibilityProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
