import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type TableName = 
  | "performance_metrics"
  | "capacity_skills"
  | "motivation_scores"
  | "activities"
  | "courses"
  | "profiles";

interface UseRealtimeDataOptions {
  table: TableName;
  userId?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: () => void;
  filter?: {
    column: string;
    value: string;
  };
}

/**
 * Hook for subscribing to realtime changes on Supabase tables
 */
export const useRealtimeData = ({
  table,
  userId,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  filter,
}: UseRealtimeDataOptions) => {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      // For user-specific tables, filter by user_id
      if (userId && table !== "courses") {
        const record = payload.new || payload.old;
        if (record?.user_id !== userId) return;
      }

      // Apply custom filter if provided
      if (filter) {
        const record = payload.new || payload.old;
        if (record?.[filter.column] !== filter.value) return;
      }

      switch (payload.eventType) {
        case "INSERT":
          onInsert?.(payload.new);
          break;
        case "UPDATE":
          onUpdate?.(payload.new);
          break;
        case "DELETE":
          onDelete?.(payload.old);
          break;
      }

      // General change callback
      onChange?.();
    },
    [userId, table, filter, onInsert, onUpdate, onDelete, onChange]
  );

  useEffect(() => {
    const channelName = `${table}-${userId || "public"}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
        },
        handleChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, userId, handleChange]);
};

/**
 * Hook for subscribing to multiple tables at once
 */
export const useMultipleRealtimeData = (
  subscriptions: UseRealtimeDataOptions[]
) => {
  useEffect(() => {
    const channels = subscriptions.map((sub, index) => {
      const channelName = `${sub.table}-multi-${sub.userId || "public"}-${index}-${Date.now()}`;
      
      return supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: sub.table,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // For user-specific tables, filter by user_id
            if (sub.userId && sub.table !== "courses") {
              const record = payload.new || payload.old;
              if (record?.user_id !== sub.userId) return;
            }

            // Apply custom filter if provided
            if (sub.filter) {
              const record = payload.new || payload.old;
              if (record?.[sub.filter.column] !== sub.filter.value) return;
            }

            switch (payload.eventType) {
              case "INSERT":
                sub.onInsert?.(payload.new);
                break;
              case "UPDATE":
                sub.onUpdate?.(payload.new);
                break;
              case "DELETE":
                sub.onDelete?.(payload.old);
                break;
            }

            sub.onChange?.();
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [subscriptions]);
};
