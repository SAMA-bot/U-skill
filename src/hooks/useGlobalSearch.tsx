import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SearchResultKind = "course" | "faculty" | "department" | "document";

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle?: string;
  /** Extra text folded into the fuzzy match. */
  keywords?: string;
  /** Route to push, or a dashboard section to activate. */
  to?: string;
  section?: string;
  status?: string;
}

interface GlobalSearchState {
  results: SearchResult[];
  loading: boolean;
  loaded: boolean;
  refresh: () => void;
}

const safe = async <T,>(promise: PromiseLike<{ data: T | null; error: unknown }>): Promise<T[]> => {
  try {
    const { data, error } = await promise;
    if (error || !data) return [];
    return data as unknown as T[];
  } catch {
    return [];
  }
};

/**
 * Loads the searchable index (learning paths, courses, faculty, departments,
 * documents) once per session. Every query is RLS-scoped, so users only ever
 * see the records they are already allowed to read.
 */
export function useGlobalSearch(enabled: boolean): GlobalSearchState {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [paths, courses, profiles, documents] = await Promise.all([
      safe<any>(
        supabase
          .from("learning_paths")
          .select("id, title, description, difficulty, estimated_hours, target_audience")
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
          .limit(100),
      ),
      safe<any>(
        supabase
          .from("courses")
          .select("id, title, category, department, instructor_name, tags")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(100),
      ),
      safe<any>(
        supabase
          .from("profiles")
          .select("user_id, full_name, email, department, designation")
          .order("full_name", { ascending: true })
          .limit(300),
      ),
      safe<any>(
        supabase
          .from("faculty_documents")
          .select("id, title, document_type, status, created_at")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(150),
      ),
    ]);

    const items: SearchResult[] = [];

    paths.forEach((p) =>
      items.push({
        id: `path-${p.id}`,
        kind: "course",
        title: p.title,
        subtitle: [p.difficulty, p.estimated_hours ? `${p.estimated_hours}h` : null, "Learning path"]
          .filter(Boolean)
          .join(" · "),
        keywords: [p.description, p.target_audience].filter(Boolean).join(" "),
        to: `/learning-paths/${p.id}`,
      }),
    );

    courses.forEach((c) =>
      items.push({
        id: `course-${c.id}`,
        kind: "course",
        title: c.title,
        subtitle: [c.category, c.department, c.instructor_name].filter(Boolean).join(" · "),
        keywords: Array.isArray(c.tags) ? c.tags.join(" ") : "",
        to: `/courses/${c.id}`,
      }),
    );

    const departments = new Map<string, number>();
    profiles.forEach((p) => {
      if (p.department) departments.set(p.department, (departments.get(p.department) ?? 0) + 1);
      items.push({
        id: `faculty-${p.user_id}`,
        kind: "faculty",
        title: p.full_name || p.email,
        subtitle: [p.designation, p.department].filter(Boolean).join(" · "),
        keywords: p.email,
        section: "faculty",
      });
    });

    Array.from(departments.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([name, count]) =>
        items.push({
          id: `dept-${name}`,
          kind: "department",
          title: name,
          subtitle: `${count} faculty member${count !== 1 ? "s" : ""}`,
          section: "departments",
        }),
      );

    documents.forEach((d) =>
      items.push({
        id: `doc-${d.id}`,
        kind: "document",
        title: d.title,
        subtitle: [d.document_type, d.status].filter(Boolean).join(" · "),
        status: d.status,
        section: "documents",
      }),
    );

    setResults(items);
    setLoading(false);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (enabled && !loaded && !loading) {
      load();
    }
  }, [enabled, loaded, loading, load]);

  const refresh = useCallback(() => {
    setLoaded(false);
    load();
  }, [load]);

  return { results, loading, loaded, refresh };
}
