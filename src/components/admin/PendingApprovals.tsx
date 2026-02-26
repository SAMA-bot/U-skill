import { useEffect, useState } from "react";
import { FileCheck, FileX, Loader2, FolderCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      icon: FolderCheck,
      badgeClass: stats.pendingDocs > 0
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
        : "bg-muted text-muted-foreground",
    },
    {
      label: "Approved",
      value: stats.recentApproved,
      icon: FileCheck,
      badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    },
    {
      label: "Rejected",
      value: stats.recentRejected,
      icon: FileX,
      badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-muted/30">
          <item.icon className="h-5 w-5 text-muted-foreground" />
          <span className="text-2xl font-bold text-foreground">{item.value}</span>
          <Badge className={`text-[10px] ${item.badgeClass}`}>{item.label}</Badge>
        </div>
      ))}
    </div>
  );
};

export default PendingApprovals;
