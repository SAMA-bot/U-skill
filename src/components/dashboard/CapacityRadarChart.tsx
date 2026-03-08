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
import { Progress } from "@/components/ui/progress";

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
          current: item.current_level ?? 0,
          target: item.target_level ?? 100,
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
    if (user) fetchData();
  }, [user]);

  useRealtimeData({
    table: "capacity_skills",
    userId: user?.id,
    onChange: () => { if (user) fetchData(); },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const hasNoProgress = capacityData.length === 0 || capacityData.every(d => d.current === 0);

  if (capacityData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-4" style={{ minHeight: 300 }}>
        <div className="text-muted-foreground mb-2">No capacity data available</div>
        <p className="text-sm text-muted-foreground/70">Complete activities to build your skills</p>
      </div>
    );
  }

  if (hasNoProgress) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-4" style={{ minHeight: 300 }}>
        <div className="text-lg font-medium text-foreground mb-2">Start Building Your Skills!</div>
        <p className="text-sm text-muted-foreground max-w-xs">
          Complete courses and activities to track your capacity growth across Teaching, Research, Leadership, and more.
        </p>
      </div>
    );
  }

  // Fallback to progress bars when fewer than 3 skills (radar needs ≥3 points)
  if (capacityData.length < 3) {
    return (
      <div className="space-y-4 px-2" style={{ minHeight: 300 }}>
        {capacityData.map((sk) => (
          <div key={sk.skill} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{sk.skill}</span>
              <span className="text-muted-foreground">{sk.current} / {sk.target}</span>
            </div>
            <Progress value={sk.current} className="h-2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={capacityData} cx="50%" cy="50%" outerRadius="70%">
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
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Radar
            name="Current"
            dataKey="current"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.4}
            strokeWidth={2}
            animationDuration={1400}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CapacityRadarChart;