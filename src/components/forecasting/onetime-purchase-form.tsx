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

export function OnetimePurchaseForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>One-Time Purchases</CardTitle>
        <CardDescription>
          Factor in revenue from non-recurring sales.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="item-price">Item Price ($)</Label>
          <Input id="item-price" type="number" placeholder="e.g., 17" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthly-sales">Avg. Monthly Sales (Units)</Label>
          <Input id="monthly-sales" type="number" placeholder="e.g., 250" />
        </div>
        <Button className="w-full" variant="secondary">Add to Forecast</Button>
      </CardContent>
    </Card>
  );
}
