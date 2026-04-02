import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Shield, Users, Crown, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, AppRole } from '@/hooks/useUserRole';

const roleConfig: Record<AppRole, { icon: typeof Shield; label: string; description: string; color: string; path: string }> = {
  admin: {
    icon: Crown,
    label: 'Administrator',
    description: 'Full system control — manage users, roles, courses, and institutional analytics.',
    color: 'from-red-500 to-rose-600',
    path: '/admin',
  },
  hod: {
    icon: Users,
    label: 'Head of Department',
    description: 'Department overview — faculty performance, approvals, and feedback.',
    color: 'from-blue-500 to-indigo-600',
    path: '/hod',
  },
  faculty: {
    icon: GraduationCap,
    label: 'Faculty',
    description: 'Learning, performance tracking, activities, and professional growth.',
    color: 'from-emerald-500 to-green-600',
    path: '/dashboard',
  },
};

export default function SelectRole() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { roles, activeRole, setActiveRole, loading: roleLoading } = useUserRole();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // If single role, auto-redirect
  useEffect(() => {
    if (!roleLoading && roles.length === 1 && activeRole) {
      const config = roleConfig[activeRole];
      navigate(config.path, { replace: true });
    }
  }, [roles, activeRole, roleLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSelect = (role: AppRole) => {
    setActiveRole(role);
    const config = roleConfig[role];
    navigate(config.path, { replace: true });
  };

  return (
    <div className="min-h-screen bg-section-alt flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container-wide mx-auto px-4 md:px-8">
          <div className="flex items-center h-16">
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg">Faculty Upgradation Portal</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              Select Your Role
            </h1>
            <p className="text-muted-foreground">
              You have access to multiple roles. Choose one to continue.
            </p>
          </motion.div>

          <div className="grid gap-4">
            {roles.map((role, i) => {
              const config = roleConfig[role];
              const Icon = config.icon;
              return (
                <motion.button
                  key={role}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleSelect(role)}
                  className="group flex items-center gap-5 p-5 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left w-full"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground">{config.label}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
