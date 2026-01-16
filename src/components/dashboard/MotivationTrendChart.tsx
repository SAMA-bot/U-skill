import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { Loader2 } from "lucide-react";

interface MotivationData {
  week: string;
  index: number;
  engagement: number;
}

const MotivationTrendChart = () => {
  const [motivationData, setMotivationData] = useState<MotivationData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("motivation_scores")
        .select("week_number, motivation_index, engagement_score")
        .eq("user_id", user.id)
        .order("year", { ascending: true })
        .order("week_number", { ascending: true })
        .limit(8);

      if (error) throw error;

      if (data) {
        const formattedData = data.map((item) => ({
          week: `W${item.week_number}`,
          index: item.motivation_index || 0,
          engagement: item.engagement_score || 0,
        }));
        setMotivationData(formattedData);
      }
    } catch (error) {
      console.error("Error fetching motivation data:", error);
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
    table: "motivation_scores",
    userId: user?.id,
    onChange: () => {
      if (user) fetchData();
    },
  });

  if (loading) {
    return (
      <div className="h-52 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (motivationData.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-muted-foreground">
        No motivation data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={motivationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="week"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={{ stroke: "hsl(var(--border))" }}
          domain={[60, 100]}
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
        <ReferenceLine
          y={80}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="5 5"
          label={{
            value: "Target",
            position: "right",
            fill: "hsl(var(--muted-foreground))",
            fontSize: 10,
          }}
        />
        <Line
          type="monotone"
          dataKey="index"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
          name="Motivation Index"
        />
        <Line
          type="monotone"
          dataKey="engagement"
          stroke="hsl(var(--accent))"
          strokeWidth={2}
          dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: "hsl(var(--accent))" }}
          name="Engagement Score"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MotivationTrendChart;