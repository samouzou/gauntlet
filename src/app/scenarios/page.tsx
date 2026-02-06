import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ForecastChart } from '@/components/charts/forecast-chart'; // Re-using for demonstration

export default function ScenariosPage() {
  const scenarios = [
    {
      name: 'Base Case',
      value: 'base',
      description: 'Your most likely financial outcome based on current data.',
      metrics: {
        revenue: '$1.5M',
        profit: '$450K',
        growth: '5%',
      },
    },
    {
      name: 'Best Case',
      value: 'best',
      description: 'An optimistic outcome with higher growth and lower churn.',
       metrics: {
        revenue: '$2.2M',
        profit: '$800K',
        growth: '8%',
      },
    },
    {
      name: 'Worst Case',
      value: 'worst',
      description: 'A pessimistic outcome with market downturns and higher churn.',
       metrics: {
        revenue: '$0.9M',
        profit: '$120K',
        growth: '1%',
      },
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario Planning</CardTitle>
        <CardDescription>
          Create and compare different financial scenarios to assess risk and opportunity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="base" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {scenarios.map((scenario) => (
              <TabsTrigger key={scenario.value} value={scenario.value}>
                {scenario.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {scenarios.map((scenario) => (
            <TabsContent key={scenario.value} value={scenario.value}>
              <Card className="mt-4">
                <CardHeader>
                    <CardTitle>{scenario.name}</CardTitle>
                    <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Projected Revenue</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{scenario.metrics.revenue}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Projected Profit</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{scenario.metrics.profit}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Assumed Growth</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{scenario.metrics.growth}</p></CardContent>
                    </Card>
                  </div>
                  <ForecastChart />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
