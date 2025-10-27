import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'moderator' | 'user';

export const useUserRoles = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUserRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRoles([]);
        setIsAdmin(false);
        setIsModerator(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const userRoles = (data || []).map(r => r.role as UserRole);
      setRoles(userRoles);
      setIsAdmin(userRoles.includes('admin'));
      setIsModerator(userRoles.includes('moderator'));
    } catch (error) {
      console.error('Error loading user roles:', error);
      setRoles([]);
      setIsAdmin(false);
      setIsModerator(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserRoles();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserRoles();
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    roles,
    isAdmin,
    isModerator,
    loading,
    refreshRoles: loadUserRoles,
  };
};
