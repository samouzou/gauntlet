import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SubscriptionForm } from '@/components/forecasting/subscription-form';
import { OnetimePurchaseForm } from '@/components/forecasting/onetime-purchase-form';
import { ForecastChart } from '@/components/charts/forecast-chart';

export default function ForecastingPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-8">
        <SubscriptionForm />
        <OnetimePurchaseForm />
      </div>
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>12-Month Revenue Forecast</CardTitle>
            <CardDescription>
              Projected revenue from subscriptions and one-time purchases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForecastChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
