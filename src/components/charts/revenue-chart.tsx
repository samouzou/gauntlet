"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';

const chartData = [
  { month: 'January', revenue: 1860 },
  { month: 'February', revenue: 3050 },
  { month: 'March', revenue: 2370 },
  { month: 'April', revenue: 730 },
  { month: 'May', revenue: 2090 },
  { month: 'June', revenue: 2140 },
  { month: 'July', revenue: 2500 },
  { month: 'August', revenue: 2900 },
  { month: 'September', revenue: 2600 },
  { month: 'October', revenue: 3100 },
  { month: 'November', revenue: 3300 },
  { month: 'December', revenue: 3800 },
];

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function RevenueChart() {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData} accessibilityLayer>
            <XAxis
              dataKey="month"
              stroke="hsl(var(--foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="hsl(var(--foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
          </BarChart>
        </ChartContainer>
      </ResponsiveContainer>
    </div>
  );
}
