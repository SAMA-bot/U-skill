import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { activeRole, roles, loading: roleLoading, error: roleError, retry } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Loading">
        <Loader2 className="w-8 h-8 animate-spin text-primary-ink" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (roleError || roles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8 max-w-md" role="alert">
          <h1 className="text-2xl font-bold text-foreground">
            {roleError ? "We couldn't load your access" : "Your account isn't set up yet"}
          </h1>
          <p className="text-muted-foreground">
            {roleError
              ? "Checking your permissions failed. Please try again."
              : "No role has been assigned to your account. Please contact an administrator."}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            {roleError && <Button onClick={retry}>Try again</Button>}
            <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  // User has multiple roles but hasn't selected one yet (skip if already on select-role)
  if (roles.length > 1 && !activeRole && location.pathname !== '/select-role') {
    return <Navigate to="/select-role" replace />;
  }

  // Check if user's active role is in allowed roles
  if (allowedRoles && activeRole && !allowedRoles.includes(activeRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to access this page with your current role.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            {roles.length > 1 && (
              <a href="/select-role" className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                Switch Role
              </a>
            )}
            <a href="/dashboard" className="inline-flex items-center px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
