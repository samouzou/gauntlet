import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function SubscriptionForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Forecasting</CardTitle>
        <CardDescription>
          Predict recurring revenue based on your subscription model.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="initial-customers">Initial Customers</Label>
          <Input id="initial-customers" type="number" defaultValue="1000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthly-growth">Monthly Growth Rate (%)</Label>
          <Input id="monthly-growth" type="number" defaultValue="5" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="churn-rate">Monthly Churn Rate (%)</Label>
          <Input id="churn-rate" type="number" defaultValue="2" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="arpa">Average Revenue Per Account ($)</Label>
          <Input id="arpa" type="number" defaultValue="99" />
        </div>
        <Button className="w-full">Update Forecast</Button>
      </CardContent>
    </Card>
  );
}
