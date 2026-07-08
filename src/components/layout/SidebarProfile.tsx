import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";

interface SidebarProfileProps {
  user: User | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  role: string;
  collapsed: boolean;
}

export const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function SidebarProfile({ user, profile, role, collapsed }: SidebarProfileProps) {
  const navigate = useNavigate();
  const displayName = profile?.full_name || user?.email || role;
  const initials = getInitials(displayName);

  return (
    <div
      className={`mx-3 mb-3 rounded-xl border border-border/60 bg-gradient-to-br from-card/90 to-muted/80 backdrop-blur-md p-2 shadow-sm transition-all duration-200 ${
        collapsed ? "flex justify-center" : ""
      }`}
    >
      <button
        onClick={() => navigate("/dashboard/settings")}
        className={`group flex items-center w-full rounded-lg transition-all duration-200 hover:bg-muted/80 ${
          collapsed ? "justify-center p-1" : "gap-3 px-2 py-2"
        }`}
        title={collapsed ? displayName : undefined}
      >
        <div className="relative flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden ring-2 ring-background/50 shadow-md">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-white font-bold text-xs">{initials}</span>
          )}
        </div>
        {!collapsed && (
          <div className="flex flex-col items-start min-w-0 text-left">
            <span className="text-sm font-semibold text-foreground truncate w-full">
              {displayName}
            </span>
            <span className="text-xs font-medium text-blue-500 dark:text-white">
              {role}
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
