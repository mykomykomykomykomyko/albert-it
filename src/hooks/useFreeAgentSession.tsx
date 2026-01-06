import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  FreeAgentSession,
  FreeAgentConfig,
  FreeAgentStatus,
  FreeAgentIterationResult,
  BlackboardEntry,
  BlackboardEntryType,
  Artifact,
  createFreeAgentSession,
  addBlackboardEntry,
  updateScratchpad,
  addNamedAttribute,
  checkForLoop,
  DEFAULT_FREE_AGENT_MODELS,
} from '@/types/freeAgent';

interface UseFreeAgentSessionOptions {
  onIterationComplete?: (result: FreeAgentIterationResult) => void;
  onComplete?: (session: FreeAgentSession) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: FreeAgentStatus) => void;
}

export function useFreeAgentSession(options: UseFreeAgentSessionOptions = {}) {
  const [session, setSession] = useState<FreeAgentSession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initializeSession = useCallback((config: FreeAgentConfig) => {
    const newSession = createFreeAgentSession(config);
    setSession(newSession);
    options.onStatusChange?.('idle');
    return newSession;
  }, [options]);

  const updateSessionStatus = useCallback((status: FreeAgentStatus) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, status };
    });
    options.onStatusChange?.(status);
  }, [options]);

  const addToBlackboard = useCallback((
    type: BlackboardEntryType,
    content: string,
    metadata?: Record<string, any>
  ): BlackboardEntry | null => {
    let entry: BlackboardEntry | null = null;
    setSession(prev => {
      if (!prev) return prev;
      entry = addBlackboardEntry(prev, type, content, metadata);
      return { ...prev, blackboard: [...prev.blackboard, entry!] };
    });
    return entry;
  }, []);

  const setScratchpad = useCallback((content: string) => {
    setSession(prev => {
      if (!prev) return prev;
      const scratchpad = updateScratchpad(prev, content);
      return { ...prev, scratchpad };
    });
  }, []);

  const setAttribute = useCallback((
    name: string,
    toolId: string,
    toolName: string,
    value: any
  ) => {
    setSession(prev => {
      if (!prev) return prev;
      addNamedAttribute(prev, name, toolId, toolName, value);
      return { ...prev, namedAttributes: [...prev.namedAttributes] };
    });
  }, []);

  const addArtifact = useCallback((artifact: Omit<Artifact, 'id' | 'createdAt' | 'iteration'>) => {
    setSession(prev => {
      if (!prev) return prev;
      const newArtifact: Artifact = {
        ...artifact,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        iteration: prev.currentIteration,
      };
      return { ...prev, artifacts: [...prev.artifacts, newArtifact] };
    });
  }, []);

  const runIteration = useCallback(async (): Promise<FreeAgentIterationResult | null> => {
    if (!session || session.status !== 'running') {
      return null;
    }

    try {
      // Build context from memory
      const context = {
        blackboard: session.blackboard.slice(-20), // Last 20 entries
        scratchpad: session.scratchpad?.content || '',
        namedAttributes: session.namedAttributes,
        artifacts: session.artifacts.map(a => ({ name: a.name, type: a.type })),
        currentIteration: session.currentIteration,
        maxIterations: session.config.maxIterations,
      };

      const { data, error } = await supabase.functions.invoke('free-agent', {
        body: {
          systemPrompt: session.config.systemPrompt,
          userPrompt: session.config.userPrompt,
          model: session.config.model.modelId,
          context,
          enabledTools: session.config.enabledTools,
          iteration: session.currentIteration,
        },
      });

      if (error) throw error;

      const result = data as FreeAgentIterationResult;

      // Check for loops
      if (result.response.content && checkForLoop(session, result.response.content)) {
        result.shouldStop = true;
        result.stopReason = 'Loop detected - agent is repeating similar outputs';
        addToBlackboard('error', 'Loop detected. Stopping to prevent infinite iteration.');
      }

      // Update session state
      setSession(prev => {
        if (!prev) return prev;
        
        const newSession = { ...prev };
        newSession.currentIteration = result.iteration + 1;
        
        // Add blackboard updates
        if (result.blackboardUpdates) {
          newSession.blackboard = [...newSession.blackboard, ...result.blackboardUpdates];
        }
        
        // Update scratchpad
        if (result.scratchpadUpdate) {
          newSession.scratchpad = result.scratchpadUpdate;
        }
        
        // Add new artifacts
        if (result.newArtifacts) {
          newSession.artifacts = [...newSession.artifacts, ...result.newArtifacts];
        }
        
        // Update token usage
        if (result.response.usage) {
          newSession.totalTokensUsed += result.response.usage.totalTokens;
          // Rough cost estimate
          newSession.estimatedCost += result.response.usage.totalTokens * 0.000001;
        }
        
        // Update status if complete or should stop
        if (result.isComplete || result.shouldStop) {
          newSession.status = 'complete';
          newSession.completedAt = new Date().toISOString();
        } else if (newSession.currentIteration >= newSession.config.maxIterations) {
          newSession.status = 'complete';
          newSession.completedAt = new Date().toISOString();
          addToBlackboard('progress', `Reached maximum iterations (${newSession.config.maxIterations})`);
        }
        
        return newSession;
      });

      options.onIterationComplete?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'error',
          lastError: err.message,
        };
      });
      options.onError?.(err);
      return null;
    }
  }, [session, addToBlackboard, options]);

  const start = useCallback(async (userPrompt?: string) => {
    if (!session) {
      toast.error('No session initialized');
      return;
    }

    // Update user prompt if provided
    if (userPrompt) {
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          config: { ...prev.config, userPrompt },
        };
      });
    }

    abortControllerRef.current = new AbortController();
    setIsProcessing(true);
    updateSessionStatus('running');

    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, startedAt: new Date().toISOString() };
    });

    addToBlackboard('progress', 'Agent session started');

    // Set up timeout
    if (session.config.timeoutSeconds > 0) {
      timeoutRef.current = setTimeout(() => {
        stop('Timeout reached');
      }, session.config.timeoutSeconds * 1000);
    }

    // Run iterations
    let currentSession = session;
    while (
      currentSession.status === 'running' &&
      currentSession.currentIteration < currentSession.config.maxIterations &&
      !abortControllerRef.current?.signal.aborted
    ) {
      const result = await runIteration();
      if (!result || result.isComplete || result.shouldStop) {
        break;
      }
      // Get latest session state
      currentSession = session;
    }

    setIsProcessing(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setSession(prev => {
      if (prev && prev.status === 'running') {
        return { ...prev, status: 'complete', completedAt: new Date().toISOString() };
      }
      return prev;
    });

    if (session) {
      options.onComplete?.(session);
    }
  }, [session, runIteration, updateSessionStatus, addToBlackboard, options]);

  const stop = useCallback((reason?: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setIsProcessing(false);
    updateSessionStatus('stopped');
    
    if (reason) {
      addToBlackboard('progress', `Session stopped: ${reason}`);
    }
  }, [updateSessionStatus, addToBlackboard]);

  const pause = useCallback(() => {
    updateSessionStatus('paused');
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, pausedAt: new Date().toISOString() };
    });
    addToBlackboard('progress', 'Session paused');
  }, [updateSessionStatus, addToBlackboard]);

  const resume = useCallback(() => {
    if (session?.status === 'paused') {
      updateSessionStatus('running');
      start();
    }
  }, [session, updateSessionStatus, start]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsProcessing(false);
    setSession(null);
    options.onStatusChange?.('idle');
  }, [options]);

  const interject = useCallback((message: string) => {
    if (!session) return;
    
    addToBlackboard('question', `[User Interjection] ${message}`);
    
    // If paused, stay paused. If running, continue with the new context
    if (session.status === 'running') {
      // The next iteration will pick up the interjection from the blackboard
    }
  }, [session, addToBlackboard]);

  const clearMemory = useCallback((type: 'blackboard' | 'scratchpad' | 'attributes' | 'all') => {
    setSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      
      if (type === 'blackboard' || type === 'all') {
        updated.blackboard = [];
      }
      if (type === 'scratchpad' || type === 'all') {
        updated.scratchpad = null;
      }
      if (type === 'attributes' || type === 'all') {
        updated.namedAttributes = [];
      }
      if (type === 'all') {
        updated.artifacts = [];
        updated.childAgents = [];
      }
      
      return updated;
    });
  }, []);

  const exportSession = useCallback(() => {
    if (!session) return null;
    
    return {
      id: session.id,
      config: session.config,
      status: session.status,
      iterations: session.currentIteration,
      blackboard: session.blackboard,
      scratchpad: session.scratchpad,
      namedAttributes: session.namedAttributes,
      artifacts: session.artifacts,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      totalTokensUsed: session.totalTokensUsed,
      estimatedCost: session.estimatedCost,
      exportedAt: new Date().toISOString(),
    };
  }, [session]);

  const loadSession = useCallback((importedSession: FreeAgentSession) => {
    // Validate the session has required fields
    if (!importedSession.id || !importedSession.config || !importedSession.blackboard) {
      toast.error('Invalid session format');
      return false;
    }

    // Reset the session to a viewable state (not running)
    const loadedSession: FreeAgentSession = {
      ...importedSession,
      status: importedSession.status === 'running' ? 'stopped' : importedSession.status,
    };

    setSession(loadedSession);
    options.onStatusChange?.(loadedSession.status);
    toast.success('Session loaded successfully');
    return true;
  }, [options]);

  return {
    session,
    isProcessing,
    initializeSession,
    start,
    stop,
    pause,
    resume,
    reset,
    interject,
    clearMemory,
    addToBlackboard,
    setScratchpad,
    setAttribute,
    addArtifact,
    exportSession,
    loadSession,
    models: DEFAULT_FREE_AGENT_MODELS,
  };
}
