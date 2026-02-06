import { DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';

import { KpiCard } from '@/components/dashboard/kpi-card';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value="$45,231.89"
          change="+20.1% from last month"
          icon={DollarSign}
        />
        <KpiCard
          title="Subscriptions"
          value="+2350"
          change="+180.1% from last month"
          icon={Users}
        />
        <KpiCard
          title="Churn Rate"
          value="3.2%"
          change="-1.2% from last month"
          icon={TrendingUp}
          invertColor
        />
        <KpiCard
          title="One-time Sales"
          value="+$1,254"
          change="+19% from last month"
          icon={CreditCard}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart />
        </CardContent>
      </Card>
    </div>
  );
}
