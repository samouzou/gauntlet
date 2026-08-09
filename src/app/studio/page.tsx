import { Suspense } from 'react';
import { StudioWorkspace } from '@/components/studio/StudioWorkspace';
import { Loader2 } from 'lucide-react';

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <StudioWorkspace />
    </Suspense>
  );
}
