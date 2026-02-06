"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Legend } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

const chartData = [
  { month: 'Jan', subscription: 99000, onetime: 4250 },
  { month: 'Feb', subscription: 101970, onetime: 4250 },
  { month: 'Mar', subscription: 105039, onetime: 4250 },
  { month: 'Apr', subscription: 108210, onetime: 4250 },
  { month: 'May', subscription: 111486, onetime: 4250 },
  { month: 'Jun', subscription: 114871, onetime: 4250 },
  { month: 'Jul', subscription: 118367, onetime: 4250 },
  { month: 'Aug', subscription: 121978, onetime: 4250 },
  { month: 'Sep', subscription: 125707, onetime: 4250 },
  { month: 'Oct', subscription: 129558, onetime: 4250 },
  { month: 'Nov', subscription: 133535, onetime: 4250 },
  { month: 'Dec', subscription: 137641, onetime: 4250 },
];

const chartConfig = {
  subscription: {
    label: 'Subscription',
    color: 'hsl(var(--primary))',
  },
  onetime: {
    label: 'One-Time',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig;

export function ForecastChart() {
  return (
    <div className="h-[450px] w-full lg:h-[550px]">
      <ResponsiveContainer width="100%" height="100%">
        <ChartContainer config={chartConfig}>
          <LineChart data={chartData} accessibilityLayer>
            <XAxis
              dataKey="month"
              stroke="hsl(var(--foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              dataKey="subscription"
              type="monotone"
              stroke="var(--color-subscription)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="onetime"
              type="monotone"
              stroke="var(--color-onetime)"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 4"
            />
          </LineChart>
        </ChartContainer>
      </ResponsiveContainer>
    </div>
  );
}
