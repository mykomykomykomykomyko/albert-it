import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  isTyping: boolean;
  isThinking: boolean;
  userName?: string;
}

export const useConversationPresence = (conversationId: string | null) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [presenceState, setPresenceState] = useState<Record<string, PresenceState>>({});

  useEffect(() => {
    if (!conversationId) return;

    const channelName = `conversation:${conversationId}`;
    const presenceChannel = supabase.channel(channelName);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('Presence sync:', state);
        
        // Convert to our format
        const formatted: Record<string, PresenceState> = {};
        Object.entries(state).forEach(([key, value]) => {
          if (value && value.length > 0) {
            const presenceData = value[0] as any;
            formatted[key] = {
              isTyping: presenceData.isTyping || false,
              isThinking: presenceData.isThinking || false,
              userName: presenceData.userName
            };
          }
        });
        setPresenceState(formatted);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe();

    setChannel(presenceChannel);

    return () => {
      console.log('Cleaning up presence channel');
      presenceChannel.unsubscribe();
    };
  }, [conversationId]);

  const broadcastTyping = async (isTyping: boolean, userName?: string) => {
    if (!channel) return;
    
    try {
      await channel.track({
        isTyping,
        isThinking: false,
        userName: userName || 'User',
        timestamp: new Date().toISOString()
      });
      console.log('Broadcasted typing state:', isTyping);
    } catch (error) {
      console.error('Error broadcasting typing state:', error);
    }
  };

  const broadcastThinking = async (isThinking: boolean) => {
    if (!channel) return;
    
    try {
      await channel.track({
        isTyping: false,
        isThinking,
        timestamp: new Date().toISOString()
      });
      console.log('Broadcasted thinking state:', isThinking);
    } catch (error) {
      console.error('Error broadcasting thinking state:', error);
    }
  };

  const getActiveUsers = (): PresenceState[] => {
    return Object.values(presenceState).filter(
      (state) => state.isTyping || state.isThinking
    );
  };

  return {
    presenceState,
    broadcastTyping,
    broadcastThinking,
    getActiveUsers
  };
};
