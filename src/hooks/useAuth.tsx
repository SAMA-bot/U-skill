import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Once any auth event arrives, the initial getSession() result is stale and must not overwrite it.
    let eventReceived = false;

    const apply = (s: Session | null) => {
      if (!active) return;
      setSession(s);
      // Keep the same user object identity when the account hasn't changed to avoid refetch storms.
      setUser(prev => (prev && s?.user && prev.id === s.user.id ? prev : s?.user ?? null));
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      eventReceived = true;
      apply(s);
    });

    supabase.auth.getSession()
      .then(({ data: { session: s } }) => { if (!eventReceived) apply(s); })
      .catch(() => { if (!eventReceived) apply(null); });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
