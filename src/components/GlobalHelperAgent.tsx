import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { HelperAgent } from './HelperAgent';

// Define context information for each route
const routeContexts: Record<string, { name: string; description: string }> = {
  '/': {
    name: 'Home Dashboard',
    description: 'Your central hub for accessing all Albert AI features. Navigate to Chat for quick conversations, Agents to create specialized AI assistants, Stage/Canvas for workflow automation, or explore Image Analysis, Voice processing, and Meeting Transcripts. Start here to jump into any capability.'
  },
  '/chat': {
    name: 'AI Chat Interface',
    description: 'Engage in intelligent conversations with AI agents. Upload files (images, PDFs, Excel, text) for analysis and discussion. Switch between different agents for specialized assistance. Perfect for quick questions, brainstorming, file analysis, and iterative problem-solving. Your conversation history is saved automatically.'
  },
  '/agents': {
    name: 'Agent Management',
    description: 'Create and manage specialized AI assistants with custom personalities, instructions, and tools. Configure system prompts, choose AI models (Gemini, GPT), and enable tools like web search, weather, API calls, and more. Each agent can be optimized for specific tasks like writing, research, coding, or customer support.'
  },
  '/marketplace': {
    name: 'Agent Marketplace',
    description: 'Discover and clone community-created agents. Browse by category, search by functionality, and preview agent configurations before cloning to your library. Rate agents, leave feedback, and publish your own successful agents to help the community. All agents can be customized after cloning.'
  },
  '/prompts': {
    name: 'Prompt Library',
    description: 'Save, organize, and reuse effective prompts with variable support. Create templates with placeholders like {{topic}} or {{audience}} for flexible reuse. Organize by categories and tags. Execute prompts directly or copy to Chat, workflows, or agents. Share successful prompts publicly.'
  },
  '/framework': {
    name: 'Framework Library',
    description: 'Access proven methodologies for structuring AI interactions: SMART goals, STAR method, 5W1H analysis, SWOT, Socratic questioning, and more. Learn how to apply these frameworks to get better AI responses for planning, analysis, decision-making, and problem-solving.'
  },
  '/stage': {
    name: 'Stage Workflow Builder',
    description: 'Build sequential multi-step workflows by chaining agents and functions. Perfect for linear processes like: content creation → editing → publishing, or data collection → analysis → reporting. Features include loop detection, execution monitoring, and mobile support. Save and share workflows.'
  },
  '/canvas': {
    name: 'Canvas Workflow Builder',
    description: 'Create complex non-linear workflows with parallel processing, conditional branching, and loops. Drag and drop agents and function nodes, connect with visual edges, and configure advanced logic. Supports iterative refinement, quality assurance loops, and map-reduce patterns. Real-time execution monitoring with node status indicators.'
  },
  '/workflow-marketplace': {
    name: 'Workflow Marketplace',
    description: 'Browse and import pre-built multi-step workflows for common tasks. Categories include content creation, data processing, customer service, research, translation, and quality assurance. Preview workflow structure before importing. Clone and customize workflows for your needs, or publish your own.'
  },
  '/image': {
    name: 'Image Analysis Tool',
    description: 'Process images and documents with AI vision. Upload multiple files for batch analysis. Capabilities: OCR text extraction, object detection, document processing (invoices, forms), chart analysis, and custom prompt-based analysis. Supports JPG, PNG, WebP, and PDF. Export results as JSON or text.'
  },
  '/voice': {
    name: 'Voice Processing',
    description: 'Two main features: Speech-to-Text for transcribing audio files (MP3, WAV, M4A, OGG), and Text-to-Speech for generating natural AI voices. Choose from multiple voices and models. Process meeting recordings, create audiobooks, generate voiceovers, or enable accessibility features. Export transcripts or download audio.'
  },
  '/transcripts': {
    name: 'Meeting Transcripts Analyzer',
    description: 'Specialized tool for analyzing meeting recordings and video call transcripts. Upload VTT, SRT, or plain text files. AI automatically extracts executive summaries, action items with assignments, key decisions made, and important discussion topics. Perfect for meeting follow-up and documentation.'
  },
  '/admin/review': {
    name: 'Admin Review Panel',
    description: 'Administrator-only panel for reviewing community-submitted agents before marketplace publication. View pending agents, check configurations, review system prompts and tools, then approve or reject submissions. Helps maintain marketplace quality and community standards.'
  },
  '/docs': {
    name: 'Documentation',
    description: 'Complete user manual covering all Albert AI features, tools, workflows, and best practices. Includes guides for Chat, Agents, Stage, Canvas, Image Analysis, Voice, Transcripts, Marketplaces, Prompts, Frameworks, and admin features. Reference for detailed instructions and examples.'
  },
  '/saved-work': {
    name: 'Saved Work',
    description: 'Access your saved workflows, canvases, and stages. Organize and manage your automation projects. Load saved work to continue building or execute saved workflows.'
  },
  '/files': {
    name: 'File Manager',
    description: 'Manage uploaded files and documents. View, organize, and delete files used across Chat, workflows, and analysis tools. Track file usage and storage.'
  },
};

export function GlobalHelperAgent() {
  const [showHelper, setShowHelper] = useState(false);
  const location = useLocation();
  
  // Listen for custom event from header button
  useEffect(() => {
    const handleOpenHelper = () => setShowHelper(true);
    window.addEventListener('openHelperAgent', handleOpenHelper);
    return () => window.removeEventListener('openHelperAgent', handleOpenHelper);
  }, []);
  
  // Get context based on current route
  const getRouteContext = () => {
    const path = location.pathname;
    
    // Check for exact match
    if (routeContexts[path]) {
      return routeContexts[path].name;
    }
    
    // Check for chat with ID pattern
    if (path.startsWith('/chat/')) {
      return routeContexts['/chat'].name;
    }
    
    // Check for admin routes
    if (path.startsWith('/admin/')) {
      return routeContexts['/admin/review']?.name || 'Admin Panel';
    }
    
    // Check for saved work routes
    if (path.startsWith('/saved-work')) {
      return routeContexts['/saved-work'].name;
    }
    
    // Check for files routes
    if (path.startsWith('/files')) {
      return routeContexts['/files'].name;
    }
    
    return 'Platform Navigation';
  };
  
  const contextName = getRouteContext();

  return (
    <>
      {/* Helper Agent Modal */}
      {showHelper && (
        <HelperAgent
          context={contextName}
          onClose={() => setShowHelper(false)}
        />
      )}
    </>
  );
}
