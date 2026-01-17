import { useState, useEffect } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { Loader2 } from "lucide-react";

interface CapacityData {
  skill: string;
  current: number;
  target: number;
}

const CapacityRadarChart = () => {
  const [capacityData, setCapacityData] = useState<CapacityData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("capacity_skills")
        .select("skill_name, current_level, target_level")
        .eq("user_id", user.id);

      if (error) throw error;

      if (data) {
        const formattedData = data.map((item) => ({
          skill: item.skill_name,
          current: item.current_level || 0,
          target: item.target_level || 100,
        }));
        setCapacityData(formattedData);
      }
    } catch (error) {
      console.error("Error fetching capacity data:", error);
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
    table: "capacity_skills",
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

  // Check if user has no capacity progress (all zeros)
  const hasNoProgress = capacityData.length === 0 || capacityData.every(d => d.current === 0);

  if (capacityData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center px-4">
        <div className="text-muted-foreground mb-2">No capacity data available</div>
        <p className="text-sm text-muted-foreground/70">Complete activities to build your skills</p>
      </div>
    );
  }

  if (hasNoProgress) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center px-4">
        <div className="text-lg font-medium text-foreground mb-2">Start Building Your Skills!</div>
        <p className="text-sm text-muted-foreground max-w-xs">
          Complete courses and activities to track your capacity growth across Teaching, Research, Leadership, and more.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <RadarChart data={capacityData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          axisLine={{ stroke: "hsl(var(--border))" }}
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
        <Radar
          name="Target"
          dataKey="target"
          stroke="hsl(var(--muted-foreground))"
          fill="hsl(var(--muted))"
          fillOpacity={0.3}
          strokeWidth={2}
          strokeDasharray="5 5"
        />
        <Radar
          name="Current"
          dataKey="current"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.4}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default CapacityRadarChart;