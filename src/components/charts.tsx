"use client";
import {
  Area,
  AreaChart,
  Bar,
  ComposedChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compact, money } from "@/lib/finance";
export const CHART_COLORS = [
  "#7c3aed",
  "#c4b5fd",
  "#007650",
  "#94a3b8",
  "#f59e0b",
];
export interface ChartPoint {
  name: string;
  income?: number;
  expense?: number;
  value?: number;
  invested?: number;
  planned?: number;
  spent?: number;
}
const tooltipStyle = {
  border: "1px solid var(--line)",
  backgroundColor: "var(--surface)",
  color: "var(--ink)",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 4px 16px #0f172a0a",
};
export function FinancialChart({
  data,
  type = "cashflow",
  height = 280,
  showSurplus = false,
}: {
  data: ChartPoint[];
  type?: "cashflow" | "growth" | "budget";
  height?: number;
  showSurplus?: boolean;
}) {
  return (
    <div
      className="chart"
      style={{ height }}
      aria-label={
        type === "cashflow"
          ? "Income and expense chart"
          : type === "budget"
            ? "Planned and actual spending chart"
            : "Portfolio growth chart"
      }
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 600, height }}
      >
        {type === "growth" ? (
          <AreaChart
            data={data}
            margin={{ top: 15, right: 10, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="portfolio-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="var(--chart-grid)"
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--chart-label)" }}
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => money(Number(value))}
            />
            <Area
              isAnimationActive={false}
              name="Invested capital"
              type="monotone"
              dataKey="invested"
              stroke="#aaa0b9"
              strokeDasharray="4 4"
              fill="transparent"
            />
            <Area
              isAnimationActive={false}
              name="Portfolio value"
              type="monotone"
              dataKey="value"
              stroke="#7c3aed"
              fill="url(#portfolio-fill)"
              strokeWidth={3}
            />
          </AreaChart>
        ) : (
          <ComposedChart
            data={data.map((point) => ({
              ...point,
              surplus: (point.income ?? 0) - (point.expense ?? 0),
            }))}
            margin={{ top: 15, right: 5, bottom: 0, left: 5 }}
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--chart-grid)"
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--chart-label)" }}
            />
            <YAxis
              tickFormatter={(value) => `₹${compact(value)}`}
              tickLine={false}
              axisLine={false}
              width={60}
              tick={{ fontSize: 10, fill: "var(--chart-label)" }}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-muted)" }}
              contentStyle={tooltipStyle}
              formatter={(value) => money(Number(value))}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            />
            <Bar
              isAnimationActive={false}
              name={type === "budget" ? "Planned target" : "Income"}
              dataKey={type === "budget" ? "planned" : "income"}
              fill="#7c3aed"
              radius={[4, 4, 0, 0]}
              maxBarSize={25}
            />
            <Bar
              isAnimationActive={false}
              name={type === "budget" ? "Actual spent" : "Expenses"}
              dataKey={type === "budget" ? "spent" : "expense"}
              fill="#c4b5fd"
              radius={[4, 4, 0, 0]}
              maxBarSize={25}
            />
            {showSurplus && (
              <Line
                name="Surplus Delta"
                type="monotone"
                dataKey="surplus"
                stroke="#007650"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
export function AllocationChart({
  data,
  center,
  caption,
  height = 220,
}: {
  data: { name: string; value: number }[];
  center: string;
  caption: string;
  height?: number;
}) {
  return (
    <div className="donut-wrap" style={{ height }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 300, height }}
      >
        <PieChart>
          <Pie
            isAnimationActive={false}
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="68%"
            outerRadius="88%"
            paddingAngle={3}
            stroke="none"
          >
            {data.map((item, index) => (
              <Cell
                key={item.name}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => money(Number(value))}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <span className="muted text-xs">{caption}</span>
        <strong className="font-mono text-xl">{center}</strong>
      </div>
    </div>
  );
}
