'use client';

import { DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { user, firestore } = useFirebase();
  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    if (user && firestore) {
      const orgsRef = collection(firestore, 'organizations');
      const q = query(orgsRef, where(`members.${user.uid}`, 'in', ['admin', 'member']));
      getDocs(q).then((snapshot) => {
        if (!snapshot.empty) {
          const orgDoc = snapshot.docs[0];
          setOrganization({ id: orgDoc.id, ...orgDoc.data() });
        }
      });
    }
  }, [user, firestore]);

  const subscriptionsQuery = useMemoFirebase(() => {
    if (!organization) return null;
    return collection(firestore, 'organizations', organization.id, 'subscriptions');
  }, [firestore, organization]);

  const onetimePurchasesQuery = useMemoFirebase(() => {
    if (!organization) return null;
    return collection(firestore, 'organizations', organization.id, 'oneTimePurchases');
  }, [firestore, organization]);

  const { data: subscriptions, isLoading: subscriptionsLoading } = useCollection(subscriptionsQuery);
  const { data: onetimePurchases, isLoading: onetimePurchasesLoading } = useCollection(onetimePurchasesQuery);

  const totalRevenue = subscriptions?.reduce((acc, sub) => acc + sub.mrr, 0) ?? 0;
  const oneTimeSales = onetimePurchases?.reduce((acc, otp) => acc + otp.amount, 0) ?? 0;
  const totalSubscriptions = subscriptions?.length ?? 0;
  const churnRate = subscriptions
    ? subscriptions.reduce((acc, sub) => acc + (sub.churnProbability ?? 0), 0) / (subscriptions.length || 1)
    : 0;

  const isLoading = subscriptionsLoading || onetimePurchasesLoading || !organization;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Monthly Revenue"
          value={isLoading ? "..." : `$${(totalRevenue).toLocaleString()}`}
          change="+20.1% from last month"
          icon={DollarSign}
        />
        <KpiCard
          title="Subscriptions"
          value={isLoading ? "..." : `+${totalSubscriptions}`}
          change="+180.1% from last month"
          icon={Users}
        />
        <KpiCard
          title="Churn Rate"
          value={isLoading ? "..." : `${(churnRate * 100).toFixed(1)}%`}
          change="-1.2% from last month"
          icon={TrendingUp}
          invertColor
        />
        <KpiCard
          title="One-time Sales"
          value={isLoading ? "..." : `+$${oneTimeSales.toLocaleString()}`}
          change="+19% from last month"
          icon={CreditCard}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart subscriptions={subscriptions} oneTimePurchases={onetimePurchases} />
        </CardContent>
      </Card>
    </div>
  );
}
