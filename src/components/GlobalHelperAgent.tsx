import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HelperAgent } from './HelperAgent';

export function GlobalHelperAgent() {
  const { t } = useTranslation('helper');
  const [showHelper, setShowHelper] = useState(false);
  const location = useLocation();

  // Define context information for each route with i18n
  const getRouteContexts = () => ({
    '/': {
      name: t('routes.home.name', 'Home Dashboard'),
      description: t('routes.home.description', 'Your central hub for accessing all Albert AI features.')
    },
    '/chat': {
      name: t('routes.chat.name', 'AI Chat Interface'),
      description: t('routes.chat.description', 'Engage in intelligent conversations with AI agents.')
    },
    '/agents': {
      name: t('routes.agents.name', 'Agent Management'),
      description: t('routes.agents.description', 'Create and manage specialized AI assistants.')
    },
    '/marketplace': {
      name: t('routes.marketplace.name', 'Agent Marketplace'),
      description: t('routes.marketplace.description', 'Discover and clone community-created agents.')
    },
    '/prompts': {
      name: t('routes.prompts.name', 'Prompt Library'),
      description: t('routes.prompts.description', 'Save, organize, and reuse effective prompts.')
    },
    '/framework': {
      name: t('routes.framework.name', 'Framework Library'),
      description: t('routes.framework.description', 'Access proven methodologies for AI interactions.')
    },
    '/stage': {
      name: t('routes.stage.name', 'Stage Workflow Builder'),
      description: t('routes.stage.description', 'Build sequential multi-step workflows.')
    },
    '/canvas': {
      name: t('routes.canvas.name', 'Canvas Workflow Builder'),
      description: t('routes.canvas.description', 'Create complex non-linear workflows.')
    },
    '/workflow-marketplace': {
      name: t('routes.workflowMarketplace.name', 'Workflow Marketplace'),
      description: t('routes.workflowMarketplace.description', 'Browse and import pre-built workflows.')
    },
    '/image': {
      name: t('routes.image.name', 'Image Analysis Tool'),
      description: t('routes.image.description', 'Process images and documents with AI vision.')
    },
    '/voice': {
      name: t('routes.voice.name', 'Voice Processing'),
      description: t('routes.voice.description', 'Speech-to-Text and Text-to-Speech features.')
    },
    '/transcripts': {
      name: t('routes.transcripts.name', 'Meeting Transcripts Analyzer'),
      description: t('routes.transcripts.description', 'Analyze meeting recordings and transcripts.')
    },
    '/admin/review': {
      name: t('routes.adminReview.name', 'Admin Review Panel'),
      description: t('routes.adminReview.description', 'Review community-submitted agents.')
    },
    '/docs': {
      name: t('routes.docs.name', 'Documentation'),
      description: t('routes.docs.description', 'Complete user manual for all features.')
    },
    '/saved-work': {
      name: t('routes.savedWork.name', 'Saved Work'),
      description: t('routes.savedWork.description', 'Access your saved workflows and canvases.')
    },
    '/files': {
      name: t('routes.files.name', 'File Manager'),
      description: t('routes.files.description', 'Manage uploaded files and documents.')
    },
  });
  
  // Listen for custom event from header button
  useEffect(() => {
    const handleOpenHelper = () => setShowHelper(true);
    window.addEventListener('openHelperAgent', handleOpenHelper);
    return () => window.removeEventListener('openHelperAgent', handleOpenHelper);
  }, []);
  
  // Get context based on current route
  const getRouteContext = () => {
    const path = location.pathname;
    const routeContexts = getRouteContexts();
    
    // Check for exact match
    if (routeContexts[path as keyof typeof routeContexts]) {
      return routeContexts[path as keyof typeof routeContexts].name;
    }
    
    // Check for chat with ID pattern
    if (path.startsWith('/chat/')) {
      return routeContexts['/chat'].name;
    }
    
    // Check for admin routes
    if (path.startsWith('/admin/')) {
      return routeContexts['/admin/review']?.name || t('routes.admin.name', 'Admin Panel');
    }
    
    // Check for saved work routes
    if (path.startsWith('/saved-work')) {
      return routeContexts['/saved-work'].name;
    }
    
    // Check for files routes
    if (path.startsWith('/files')) {
      return routeContexts['/files'].name;
    }
    
    return t('routes.default.name', 'Platform Navigation');
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