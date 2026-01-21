import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AuditLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface UseAuditLogsOptions {
  actionType?: string;
  entityType?: string;
  userId?: string;
  limit?: number;
}

export const useAuditLogs = (options: UseAuditLogsOptions = {}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchLogs = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(options.limit || 100);

      if (options.actionType) {
        query = query.eq("action_type", options.actionType);
      }

      if (options.entityType) {
        query = query.eq("entity_type", options.entityType);
      }

      if (options.userId) {
        query = query.eq("user_id", options.userId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setLogs((data || []) as AuditLog[]);
    } catch (err: any) {
      console.error("Error fetching audit logs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, options.actionType, options.entityType, options.userId, options.limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  };
};
