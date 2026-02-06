"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { useMemo } from 'react';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function RevenueChart({ subscriptions, oneTimePurchases }: { subscriptions: any[] | null, oneTimePurchases: any[] | null }) {

  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => subMonths(new Date(), i)).reverse();

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      let monthlyRevenue = 0;

      subscriptions?.forEach(sub => {
        const subStartDate = new Date(sub.startDate);
        if (subStartDate <= monthEnd && (!sub.endDate || new Date(sub.endDate) > monthStart)) {
          monthlyRevenue += sub.mrr;
        }
      });
      
      oneTimePurchases?.forEach(otp => {
        const purchaseDate = new Date(otp.purchaseDate);
        if (purchaseDate >= monthStart && purchaseDate <= monthEnd) {
          monthlyRevenue += otp.amount;
        }
      });

      return {
        month: format(month, 'MMMM'),
        revenue: monthlyRevenue,
      };
    });
  }, [subscriptions, oneTimePurchases]);

  if (!subscriptions && !oneTimePurchases) {
    return <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">Loading chart data...</div>
  }

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
              tickFormatter={(value) => `$${value/1000}k`}
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
