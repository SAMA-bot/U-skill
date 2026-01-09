import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const capacityData = [
  { skill: "Pedagogy", current: 85, target: 95 },
  { skill: "Research", current: 75, target: 90 },
  { skill: "Technology", current: 80, target: 85 },
  { skill: "Leadership", current: 70, target: 80 },
  { skill: "Communication", current: 88, target: 92 },
  { skill: "Innovation", current: 72, target: 88 },
];

const CapacityRadarChart = () => {
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
