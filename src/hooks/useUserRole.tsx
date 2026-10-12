import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'faculty' | 'hod';

const VALID_ROLES: AppRole[] = ['admin', 'faculty', 'hod'];

interface UseUserRoleReturn {
  roles: AppRole[];
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  isAdmin: boolean;
  isHod: boolean;
  isFaculty: boolean;
  hasRole: (role: AppRole) => boolean;
  loading: boolean;
  /** Set when the role lookup itself failed (not the same as "no roles"). */
  error: string | null;
  retry: () => void;
}

const LEGACY_ACTIVE_ROLE_KEY = 'active_role';
/** The stored value is only a UI preference; it is always validated against server roles. */
export const activeRoleKey = (userId: string) => `active_role:${userId}`;

export function useUserRole(): UseUserRoleReturn {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesFor, setRolesFor] = useState<string | null>(null);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    localStorage.removeItem(LEGACY_ACTIVE_ROLE_KEY);

    setRoles([]);
    setActiveRoleState(null);
    setError(null);

    if (!userId) {
      setRolesFor(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          console.error('Error fetching user roles:', err);
          setError("We couldn't check your account permissions.");
        } else {
          setRoles((data ?? []).map(d => d.role).filter((r): r is AppRole => VALID_ROLES.includes(r as AppRole)));
        }
        setRolesFor(userId);
        setLoading(false);
      }, (err: unknown) => {
        if (cancelled) return;
        console.error('Error fetching roles:', err);
        setError("We couldn't check your account permissions.");
        setRolesFor(userId);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, authLoading, attempt]);

  useEffect(() => {
    if (!userId || roles.length === 0) return;
    const key = activeRoleKey(userId);
    const stored = localStorage.getItem(key) as AppRole | null;
    if (stored && roles.includes(stored)) {
      setActiveRoleState(stored);
    } else if (roles.length === 1) {
      setActiveRoleState(roles[0]);
      localStorage.setItem(key, roles[0]);
    } else {
      setActiveRoleState(null);
    }
  }, [roles, userId]);

  const setActiveRole = useCallback((role: AppRole) => {
    if (userId && roles.includes(role)) {
      setActiveRoleState(role);
      localStorage.setItem(activeRoleKey(userId), role);
    }
  }, [roles, userId]);

  const hasRole = (role: AppRole) => roles.includes(role);
  // Roles fetched for a previous account are never reported as current.
  const stale = !!userId && rolesFor !== userId;

  return {
    roles: stale ? [] : roles,
    activeRole: stale ? null : activeRole,
    setActiveRole,
    isAdmin: !stale && activeRole === 'admin',
    isHod: !stale && activeRole === 'hod',
    isFaculty: !stale && activeRole === 'faculty',
    hasRole,
    loading: loading || authLoading || stale,
    error,
    retry: () => setAttempt(a => a + 1),
  };
}
