import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Check, X, Info } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PermissionLevel = "full" | "view" | "none";

interface ModuleAccess {
  module: string;
  description: string;
  admin: { view: boolean; edit: boolean; approve: boolean; delete: boolean };
  hod: { view: boolean; edit: boolean; approve: boolean; delete: boolean };
  faculty: { view: boolean; edit: boolean; approve: boolean; delete: boolean };
}

const moduleAccessData: ModuleAccess[] = [
  {
    module: "Dashboard",
    description: "Main dashboard with performance overview",
    admin: { view: true, edit: true, approve: true, delete: true },
    hod: { view: true, edit: false, approve: false, delete: false },
    faculty: { view: true, edit: false, approve: false, delete: false },
  },
  {
    module: "Performance Metrics",
    description: "Teaching, research, and service scores",
    admin: { view: true, edit: true, approve: true, delete: true },
    hod: { view: true, edit: false, approve: true, delete: false },
    faculty: { view: true, edit: true, approve: false, delete: false },
  },
  {
    module: "Capacity Building",
    description: "Courses and training programs",
    admin: { view: true, edit: true, approve: true, delete: true },
    hod: { view: true, edit: false, approve: false, delete: false },
    faculty: { view: true, edit: false, approve: false, delete: false },
  },
  {
    module: "Document Management",
    description: "Faculty document uploads and reviews",
    admin: { view: true, edit: true, approve: true, delete: true },
    hod: { view: true, edit: false, approve: true, delete: false },
    faculty: { view: true, edit: true, approve: false, delete: true },
  },
  {
    module: "User Management",
    description: "Create, edit, and delete user accounts",
    admin: { view: true, edit: true, approve: true, delete: true },
    hod: { view: true, edit: false, approve: false, delete: false },
    faculty: { view: false, edit: false, approve: false, delete: false },
  },
  {
    module: "Role Management",
    description: "Assign and modify user roles",
    admin: { view: true, edit: true, approve: true, delete: true },
    hod: { view: true, edit: false, approve: false, delete: false },
    faculty: { view: false, edit: false, approve: false, delete: false },
  },
  {
    module: "Audit Logs",
    description: "System activity and change logs",
    admin: { view: true, edit: false, approve: false, delete: false },
    hod: { view: false, edit: false, approve: false, delete: false },
    faculty: { view: true, edit: false, approve: false, delete: false },
  },
  {
    module: "Feedback & Reviews",
    description: "Faculty feedback and peer reviews",
    admin: { view: true, edit: true, approve: true, delete: true },
    hod: { view: true, edit: true, approve: true, delete: false },
    faculty: { view: true, edit: true, approve: false, delete: false },
  },
  {
    module: "Self Assessment",
    description: "Faculty self-assessment forms",
    admin: { view: true, edit: false, approve: true, delete: false },
    hod: { view: true, edit: false, approve: true, delete: false },
    faculty: { view: true, edit: true, approve: false, delete: false },
  },
  {
    module: "Calendar & Events",
    description: "Personal and institutional calendar",
    admin: { view: true, edit: true, approve: true, delete: true },
    hod: { view: true, edit: true, approve: false, delete: true },
    faculty: { view: true, edit: true, approve: false, delete: true },
  },
  {
    module: "Motivation Tools",
    description: "Streaks, badges, journals, checklists",
    admin: { view: true, edit: true, approve: false, delete: true },
    hod: { view: true, edit: false, approve: false, delete: false },
    faculty: { view: true, edit: true, approve: false, delete: true },
  },
];

const permissionTypes = ["view", "edit", "approve", "delete"] as const;

const PermissionCell = ({ allowed }: { allowed: boolean }) => (
  <span className="flex items-center justify-center">
    {allowed ? (
      <Check className="h-4 w-4 text-emerald-500" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground/40" />
    )}
  </span>
);

const getRoleBadgeStyle = (role: string): React.CSSProperties => {
  switch (role) {
    case "admin":
      return { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" };
    case "hod":
      return { background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" };
    case "faculty":
      return { background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" };
    default:
      return { background: "rgba(156,163,175,0.15)", color: "#9ca3af", border: "1px solid rgba(156,163,175,0.3)" };
  }
};

export default function RoleAccessMatrix() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const roles = ["admin", "hod", "faculty"] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Role Legend */}
      <div className="flex flex-wrap gap-3">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(selectedRole === role ? null : role)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              selectedRole === role
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Badge style={getRoleBadgeStyle(role)} className="border-0">
              {role === "hod" ? "HOD / Reviewer" : role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {role === "admin" && "Full system access"}
              {role === "hod" && "Department oversight"}
              {role === "faculty" && "Personal workspace"}
            </span>
          </button>
        ))}
      </div>

      {/* Permission Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
        <span className="font-medium">Legend:</span>
        <span className="flex items-center gap-1">
          <Check className="h-3 w-3 text-emerald-500" /> Allowed
        </span>
        <span className="flex items-center gap-1">
          <X className="h-3 w-3 text-muted-foreground/40" /> Denied
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Info className="h-3 w-3" /> Permissions are enforced at the database level via RLS policies
        </span>
      </div>

      {/* Access Matrix Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[200px] font-semibold">Module</TableHead>
                {roles.map((role) => (
                  <TableHead
                    key={role}
                    colSpan={4}
                    className={`text-center font-semibold border-l border-border ${
                      selectedRole && selectedRole !== role ? "opacity-30" : ""
                    }`}
                  >
                    <Badge style={getRoleBadgeStyle(role)} className="border-0">
                      {role === "hod" ? "HOD / Reviewer" : role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                  </TableHead>
                ))}
              </TableRow>
              <TableRow className="bg-muted/10">
                <TableHead />
                {roles.map((role) =>
                  permissionTypes.map((perm) => (
                    <TableHead
                      key={`${role}-${perm}`}
                      className={`text-center text-xs px-2 border-l border-border first:border-l-0 ${
                        selectedRole && selectedRole !== role ? "opacity-30" : ""
                      }`}
                    >
                      {perm.charAt(0).toUpperCase() + perm.slice(1)}
                    </TableHead>
                  ))
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {moduleAccessData.map((mod, idx) => (
                <TooltipProvider key={mod.module}>
                  <TableRow className={idx % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                    <TableCell className="font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1.5 cursor-help">
                          {mod.module}
                          <Info className="h-3 w-3 text-muted-foreground/50" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="text-xs max-w-[200px]">{mod.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    {roles.map((role) =>
                      permissionTypes.map((perm) => (
                        <TableCell
                          key={`${role}-${perm}`}
                          className={`text-center px-2 border-l border-border ${
                            selectedRole && selectedRole !== role ? "opacity-30" : ""
                          }`}
                        >
                          <PermissionCell allowed={mod[role][perm]} />
                        </TableCell>
                      ))
                    )}
                  </TableRow>
                </TooltipProvider>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  );
}
