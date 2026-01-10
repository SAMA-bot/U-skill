import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'admin' | 'faculty' | 'hod';

interface UseUserRoleReturn {
  role: AppRole | null;
  isAdmin: boolean;
  isHod: boolean;
  isFaculty: boolean;
  loading: boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('faculty'); // Default to faculty
        } else {
          setRole(data?.role ?? 'faculty');
        }
      } catch (err) {
        console.error('Error fetching role:', err);
        setRole('faculty');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user, authLoading]);

  return {
    role,
    isAdmin: role === 'admin',
    isHod: role === 'hod',
    isFaculty: role === 'faculty',
    loading: loading || authLoading,
  };
}
