import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { RedeemForm } from '@/components/appsumo/RedeemForm';

export const metadata = { title: 'Redeem your AppSumo code' };

export default function RedeemPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <RedeemForm />
    </Suspense>
  );
}
