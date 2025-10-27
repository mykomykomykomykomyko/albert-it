import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { HelperAgent } from './HelperAgent';

// Define context information for each route
const routeContexts: Record<string, { name: string; description: string }> = {
  '/': {
    name: 'Home Dashboard',
    description: 'This is your main dashboard where you can access all features of the platform.'
  },
  '/chat': {
    name: 'AI Chat',
    description: 'Have conversations with AI agents, upload files, and analyze content with context.'
  },
  '/agents': {
    name: 'Agent Management',
    description: 'Create, customize, and manage your AI agents with different personalities and capabilities.'
  },
  '/marketplace': {
    name: 'Agent Marketplace',
    description: 'Browse and clone pre-built agents created by the community.'
  },
  '/prompts': {
    name: 'Prompt Library',
    description: 'Access a collection of proven prompts and frameworks for various use cases.'
  },
  '/framework': {
    name: 'Prompt Frameworks',
    description: 'Learn and apply structured prompting frameworks to improve AI responses.'
  },
  '/stage': {
    name: 'Stage Workflow Builder',
    description: 'Build sequential multi-agent workflows with stages, connections, and advanced logic.'
  },
  '/canvas': {
    name: 'Canvas Workflow Builder',
    description: 'Create visual AI workflows by connecting nodes for complex multi-step processes.'
  },
  '/workflow-marketplace': {
    name: 'Workflow Marketplace',
    description: 'Discover and clone pre-built workflows for common tasks and use cases.'
  },
  '/image': {
    name: 'Image Analysis',
    description: 'Analyze images, extract text with OCR, and detect objects using AI vision models.'
  },
  '/voice': {
    name: 'Voice Analysis',
    description: 'Convert speech to text, generate AI voices, and analyze audio content.'
  },
  '/transcripts': {
    name: 'Meeting Transcripts',
    description: 'Process meeting transcripts, extract action items, and generate summaries.'
  },
};

export function GlobalHelperAgent() {
  const [showHelper, setShowHelper] = useState(false);
  const location = useLocation();
  
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
    
    return 'Platform Navigation';
  };
  
  const contextName = getRouteContext();

  return (
    <>
      {/* Floating Helper Button */}
      {!showHelper && (
        <Button
          onClick={() => setShowHelper(true)}
          className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform"
          size="icon"
          title="AI Helper - Ask me anything!"
        >
          <HelpCircle className="h-6 w-6" />
        </Button>
      )}

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
