import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  FileText,
  GraduationCap,
  Loader2,
  Search,
  Users,
  LayoutDashboard,
  Settings,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useGlobalSearch, SearchResult, SearchResultKind } from "@/hooks/useGlobalSearch";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

const KIND_META: Record<SearchResultKind, { label: string; icon: typeof Users }> = {
  course: { label: "Courses & learning paths", icon: GraduationCap },
  faculty: { label: "Faculty", icon: Users },
  department: { label: "Departments", icon: Building2 },
  document: { label: "Documents", icon: FileText },
};

const KIND_ORDER: SearchResultKind[] = ["course", "faculty", "department", "document"];

const MAX_PER_GROUP = 6;

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GlobalCommandPalette = ({ open, onOpenChange }: GlobalCommandPaletteProps) => {
  const navigate = useNavigate();
  const { activeRole } = useUserRole();
  const { results, loading } = useGlobalSearch(open);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const dashboardPath = activeRole === "admin" ? "/admin" : activeRole === "hod" ? "/hod" : "/dashboard";

  const allowedKinds: SearchResultKind[] = useMemo(() => {
    if (activeRole === "admin") return KIND_ORDER;
    if (activeRole === "hod") return ["course", "faculty", "department", "document"];
    return ["course", "document"];
  }, [activeRole]);

  const grouped = useMemo(() => {
    const map = new Map<SearchResultKind, SearchResult[]>();
    results.forEach((r) => {
      if (!allowedKinds.includes(r.kind)) return;
      if (!map.has(r.kind)) map.set(r.kind, []);
      map.get(r.kind)!.push(r);
    });
    return KIND_ORDER.filter((k) => map.has(k)).map((k) => ({ kind: k, items: map.get(k)!.slice(0, 40) }));
  }, [results, allowedKinds]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const openResult = (result: SearchResult) => {
    if (result.to) {
      go(result.to);
      return;
    }
    if (result.section) {
      go(`${dashboardPath}?section=${result.section}&q=${encodeURIComponent(result.title)}`);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search courses, faculty, departments, documents…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[420px]">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading search index…
          </div>
        )}

        {!loading && <CommandEmpty>No matches found.</CommandEmpty>}

        {!loading && (
          <>
            <CommandGroup heading="Go to">
              <CommandItem value="dashboard home overview" onSelect={() => go(dashboardPath)}>
                <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
                Dashboard
              </CommandItem>
              <CommandItem value="profile settings account" onSelect={() => go("/dashboard/settings")}>
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                Profile settings
              </CommandItem>
            </CommandGroup>

            {grouped.map(({ kind, items }) => {
              const meta = KIND_META[kind];
              const Icon = meta.icon;
              return (
                <div key={kind}>
                  <CommandSeparator />
                  <CommandGroup heading={meta.label}>
                    {items.slice(0, query ? items.length : MAX_PER_GROUP).map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.title} ${item.subtitle ?? ""} ${item.keywords ?? ""}`}
                        onSelect={() => openResult(item)}
                        className="gap-2"
                      >
                        <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{item.title}</p>
                          {item.subtitle && (
                            <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                          )}
                        </div>
                        {item.status && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] capitalize",
                              item.status === "approved" && "bg-success/15 text-success",
                              item.status === "rejected" && "bg-destructive/15 text-destructive",
                            )}
                          >
                            {item.status}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              );
            })}
          </>
        )}
      </CommandList>
      <div className="flex items-center justify-between border-t border-border/50 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Search className="h-3 w-3" /> Global search
        </span>
        <span>
          <kbd className="rounded border border-border bg-muted px-1">↑↓</kbd> navigate{" "}
          <kbd className="rounded border border-border bg-muted px-1">↵</kbd> open{" "}
          <kbd className="rounded border border-border bg-muted px-1">esc</kbd> close
        </span>
      </div>
    </CommandDialog>
  );
};

export default GlobalCommandPalette;
