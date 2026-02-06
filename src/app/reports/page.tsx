import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import { RevenueChart } from '@/components/charts/revenue-chart';
import { CashflowChart } from '@/components/charts/cashflow-chart';
import { Badge } from '@/components/ui/badge';

const transactions = [
    { id: "TRX001", date: "2023-10-01", amount: "$2,500.00", type: "Subscription", status: "Paid" },
    { id: "TRX002", date: "2023-10-02", amount: "$150.00", type: "One-time", status: "Paid" },
    { id: "TRX003", date: "2023-10-03", amount: "$3,500.00", type: "Subscription", status: "Pending" },
    { id: "TRX004", date: "2023-10-04", amount: "$450.00", type: "Consulting", status: "Paid" },
    { id: "TRX005", date: "2023-10-05", amount: "$550.00", type: "Subscription", status: "Failed" },
]

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Report</CardTitle>
          <CardDescription>
            A detailed breakdown of revenue streams over the year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Report</CardTitle>
          <CardDescription>
            A summary of cash inflows and outflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CashflowChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            A log of the most recent financial transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((t) => (
                        <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.id}</TableCell>
                            <TableCell>{t.date}</TableCell>
                            <TableCell>{t.type}</TableCell>
                            <TableCell>
                                <Badge variant={
                                    t.status === 'Paid' ? 'default' : t.status === 'Pending' ? 'secondary' : 'destructive'
                                } className={
                                    t.status === 'Paid' ? 'bg-green-500' : ''
                                }>{t.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{t.amount}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
