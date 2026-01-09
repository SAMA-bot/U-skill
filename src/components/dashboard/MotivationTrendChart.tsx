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

const motivationData = [
  { week: "W1", index: 75, engagement: 70 },
  { week: "W2", index: 78, engagement: 74 },
  { week: "W3", index: 74, engagement: 72 },
  { week: "W4", index: 80, engagement: 78 },
  { week: "W5", index: 82, engagement: 80 },
  { week: "W6", index: 79, engagement: 77 },
  { week: "W7", index: 85, engagement: 82 },
  { week: "W8", index: 82, engagement: 84 },
];

const MotivationTrendChart = () => {
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
