import { useEffect, useState } from "react";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ApprovalStats {
  pendingDocs: number;
  recentApproved: number;
  recentRejected: number;
}

const PendingApprovals = () => {
  const [stats, setStats] = useState<ApprovalStats>({ pendingDocs: 0, recentApproved: 0, recentRejected: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [pending, approved, rejected] = await Promise.all([
        supabase.from("faculty_documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("faculty_documents").select("id", { count: "exact", head: true }).eq("status", "verified"),
        supabase.from("faculty_documents").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      ]);

      setStats({
        pendingDocs: pending.count || 0,
        recentApproved: approved.count || 0,
        recentRejected: rejected.count || 0,
      });
    } catch (err) {
      console.error("Error fetching approval stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = [
    {
      label: "Pending Review",
      value: stats.pendingDocs,
      Icon: Clock,
      bg: "bg-warning/15 dark:bg-warning/20",
      iconColor: "text-warning dark:text-warning",
      textColor: "text-warning dark:text-warning",
      border: "border-warning/40",
    },
    {
      label: "Approved",
      value: stats.recentApproved,
      Icon: CheckCircle2,
      bg: "bg-success/15 dark:bg-success/20",
      iconColor: "text-success dark:text-success",
      textColor: "text-success dark:text-success",
      border: "border-success/40",
    },
    {
      label: "Rejected",
      value: stats.recentRejected,
      Icon: XCircle,
      bg: "bg-destructive/15 dark:bg-destructive/20",
      iconColor: "text-destructive dark:text-destructive",
      textColor: "text-destructive dark:text-destructive",
      border: "border-destructive/40",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${item.bg} ${item.border} transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg cursor-default`}
        >
          <item.Icon className={`h-5 w-5 ${item.iconColor}`} />
          <span className={`text-3xl font-extrabold ${item.textColor}`}>{item.value}</span>
          <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default PendingApprovals;
