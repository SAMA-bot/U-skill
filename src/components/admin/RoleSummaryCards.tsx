import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, UserCog, GraduationCap, Eye, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RoleSummary {
  role: AppRole;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  permissions: string[];
  userCount: number;
}

export default function RoleSummaryCards() {
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoleCounts();
  }, []);

  const fetchRoleCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role");

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((r) => {
        counts[r.role] = (counts[r.role] || 0) + 1;
      });
      setRoleCounts(counts);
    } catch (err) {
      console.error("Error fetching role counts:", err);
    } finally {
      setLoading(false);
    }
  };

  const roles: RoleSummary[] = [
    {
      role: "admin",
      label: "Admin",
      description: "Full system access with user management, role assignment, and all administrative capabilities.",
      icon: Shield,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      permissions: ["View All", "Edit All", "Approve", "Delete", "Manage Users", "Manage Roles"],
      userCount: roleCounts["admin"] || 0,
    },
    {
      role: "hod",
      label: "HOD / Reviewer",
      description: "Department-level oversight with document approval, performance review, and feedback capabilities.",
      icon: Eye,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      permissions: ["View Department", "Approve Documents", "Review Performance", "Submit Feedback"],
      userCount: roleCounts["hod"] || 0,
    },
    {
      role: "faculty",
      label: "Faculty",
      description: "Personal workspace for managing activities, self-assessments, documents, and motivation tools.",
      icon: GraduationCap,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      permissions: ["View Own Data", "Edit Profile", "Upload Documents", "Self-Assess", "Enroll Courses"],
      userCount: roleCounts["faculty"] || 0,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {roles.map((role, idx) => {
        const Icon = role.icon;
        return (
          <motion.div
            key={role.role}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${role.bgColor} rounded-lg p-3`}>
                <Icon className={`h-6 w-6 ${role.color}`} />
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm font-semibold">{role.userCount}</span>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-1">{role.label}</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {role.description}
            </p>

            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Permissions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map((perm) => (
                  <Badge
                    key={perm}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
