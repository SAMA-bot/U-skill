import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { Loader2 } from "lucide-react";

interface PerformanceData {
  month: string;
  teaching: number;
  research: number;
  service: number;
}

const PerformanceChart = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("performance_metrics")
        .select("month, teaching_score, research_score, service_score")
        .eq("user_id", user.id)
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .limit(6);

      if (error) throw error;

      if (data) {
        const formattedData = data.map((item) => ({
          month: item.month,
          teaching: item.teaching_score || 0,
          research: item.research_score || 0,
          service: item.service_score || 0,
        }));
        setPerformanceData(formattedData);
      }
    } catch (error) {
      console.error("Error fetching performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Realtime subscription
  useRealtimeData({
    table: "performance_metrics",
    userId: user?.id,
    onChange: () => {
      if (user) fetchData();
    },
  });

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (performanceData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No performance data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTeaching" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorResearch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorService" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="month" 
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis 
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={{ stroke: "hsl(var(--border))" }}
          domain={[50, 100]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--foreground))",
          }}
          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
        />
        <Area
          type="monotone"
          dataKey="teaching"
          stroke="hsl(var(--primary))"
          fillOpacity={1}
          fill="url(#colorTeaching)"
          strokeWidth={2}
          name="Teaching"
        />
        <Area
          type="monotone"
          dataKey="research"
          stroke="hsl(var(--accent))"
          fillOpacity={1}
          fill="url(#colorResearch)"
          strokeWidth={2}
          name="Research"
        />
        <Area
          type="monotone"
          dataKey="service"
          stroke="#22c55e"
          fillOpacity={1}
          fill="url(#colorService)"
          strokeWidth={2}
          name="Service"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default PerformanceChart;