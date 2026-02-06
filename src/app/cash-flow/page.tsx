import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CashflowChart } from '@/components/charts/cashflow-chart';

export default function CashFlowPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Projections</CardTitle>
        <CardDescription>
          Forecast your cash flow based on projected revenue and expenses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Inflow</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">$1,530,349</p>
                    <p className="text-xs text-muted-foreground">Projected over 12 months</p>
                </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Outflow</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">$300,000</p>
                    <p className="text-xs text-muted-foreground">Projected over 12 months</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-primary">$1,230,349</p>
                    <p className="text-xs text-muted-foreground">Projected ending balance</p>
                </CardContent>
            </Card>
        </div>
        <CashflowChart />
      </CardContent>
    </Card>
  );
}
