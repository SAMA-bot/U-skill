import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const performanceData = [
  { month: "Jan", teaching: 72, research: 65, service: 78 },
  { month: "Feb", teaching: 75, research: 68, service: 80 },
  { month: "Mar", teaching: 78, research: 72, service: 82 },
  { month: "Apr", teaching: 74, research: 75, service: 79 },
  { month: "May", teaching: 80, research: 78, service: 85 },
  { month: "Jun", teaching: 82, research: 80, service: 88 },
];

const PerformanceChart = () => {
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
