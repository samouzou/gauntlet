"use client";

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Legend } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

const chartData = [
  { month: 'Jan', inflow: 103250, outflow: 25000 },
  { month: 'Feb', inflow: 106220, outflow: 25000 },
  { month: 'Mar', inflow: 109289, outflow: 25000 },
  { month: 'Apr', inflow: 112460, outflow: 25000 },
  { month: 'May', inflow: 115736, outflow: 25000 },
  { month: 'Jun', inflow: 119121, outflow: 25000 },
  { month: 'Jul', inflow: 122617, outflow: 25000 },
  { month: 'Aug', inflow: 126228, outflow: 25000 },
  { month: 'Sep', inflow: 129957, outflow: 25000 },
  { month: 'Oct', inflow: 133808, outflow: 25000 },
  { month: 'Nov', inflow: 137785, outflow: 25000 },
  { month: 'Dec', inflow: 141891, outflow: 25000 },
].map(d => ({ ...d, net: d.inflow - d.outflow }));

const chartConfig = {
  inflow: {
    label: 'Inflow',
    color: 'hsl(var(--chart-2))',
  },
  outflow: {
    label: 'Outflow',
    color: 'hsl(var(--destructive))',
  },
  net: {
    label: 'Net Cash Flow',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function CashflowChart() {
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartContainer config={chartConfig}>
          <AreaChart data={chartData} accessibilityLayer>
            <defs>
              <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-inflow)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--color-inflow)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-outflow)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--color-outflow)" stopOpacity={0}/>
              </linearGradient>
            </defs>
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
            <Area
              dataKey="inflow"
              type="monotone"
              fill="url(#colorInflow)"
              stroke="var(--color-inflow)"
              stackId="1"
            />
             <Area
              dataKey="outflow"
              type="monotone"
              fill="url(#colorOutflow)"
              stroke="var(--color-outflow)"
              stackId="2"
            />
          </AreaChart>
        </ChartContainer>
      </ResponsiveContainer>
    </div>
  );
}
