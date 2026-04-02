import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'faculty' | 'hod';

interface UseUserRoleReturn {
  roles: AppRole[];
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  isAdmin: boolean;
  isHod: boolean;
  isFaculty: boolean;
  hasRole: (role: AppRole) => boolean;
  loading: boolean;
}

const ACTIVE_ROLE_KEY = 'active_role';

export function useUserRole(): UseUserRoleReturn {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRoles([]);
      setActiveRoleState(null);
      localStorage.removeItem(ACTIVE_ROLE_KEY);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user roles:', error);
          setRoles(['faculty']);
        } else {
          const fetchedRoles = (data?.map(d => d.role) ?? ['faculty']) as AppRole[];
          setRoles(fetchedRoles.length > 0 ? fetchedRoles : ['faculty']);
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
        setRoles(['faculty']);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user, authLoading]);

  // Restore active role from localStorage or auto-select if single role
  useEffect(() => {
    if (roles.length === 0) return;

    const stored = localStorage.getItem(ACTIVE_ROLE_KEY) as AppRole | null;
    if (stored && roles.includes(stored)) {
      setActiveRoleState(stored);
    } else if (roles.length === 1) {
      setActiveRoleState(roles[0]);
      localStorage.setItem(ACTIVE_ROLE_KEY, roles[0]);
    } else {
      // Multiple roles but no valid stored role — leave null to trigger selection
      setActiveRoleState(null);
    }
  }, [roles]);

  const setActiveRole = (role: AppRole) => {
    if (roles.includes(role)) {
      setActiveRoleState(role);
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return {
    roles,
    activeRole,
    setActiveRole,
    isAdmin: activeRole === 'admin',
    isHod: activeRole === 'hod',
    isFaculty: activeRole === 'faculty',
    hasRole,
    loading: loading || authLoading,
  };
}
