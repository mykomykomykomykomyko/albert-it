import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useConversationSharing = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateShareLink = async (conversationId: string): Promise<string | null> => {
    setIsGenerating(true);
    try {
      // Generate a unique share token
      const { data, error } = await supabase
        .from('conversations')
        .update({
          share_token: crypto.randomUUID(),
          is_shared: true
        })
        .eq('id', conversationId)
        .select('share_token')
        .single();

      if (error) {
        console.error('Error generating share link:', error);
        toast.error('Failed to generate share link');
        return null;
      }

      if (!data?.share_token) {
        toast.error('Failed to generate share token');
        return null;
      }

      // Return the full shareable URL
      const shareUrl = `${window.location.origin}/chat/shared/${data.share_token}`;
      return shareUrl;
    } catch (error) {
      console.error('Error in generateShareLink:', error);
      toast.error('Failed to generate share link');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeShareLink = async (conversationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          share_token: null,
          is_shared: false
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error revoking share link:', error);
        toast.error('Failed to revoke share link');
        return false;
      }

      toast.success('Share link revoked successfully');
      return true;
    } catch (error) {
      console.error('Error in revokeShareLink:', error);
      toast.error('Failed to revoke share link');
      return false;
    }
  };

  const getShareStatus = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('is_shared, share_token')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Error getting share status:', error);
        return { isShared: false, shareToken: null };
      }

      return {
        isShared: data?.is_shared || false,
        shareToken: data?.share_token || null
      };
    } catch (error) {
      console.error('Error in getShareStatus:', error);
      return { isShared: false, shareToken: null };
    }
  };

  return {
    generateShareLink,
    revokeShareLink,
    getShareStatus,
    isGenerating
  };
};
