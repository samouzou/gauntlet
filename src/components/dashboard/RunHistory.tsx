'use client';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { GauntletRun } from '@/lib/types';
import { cn } from '@/lib/utils';

const getScoreColor = (score: number): string => {
  if (score > 75) return 'text-green-400';
  if (score > 50) return 'text-amber-400';
  return 'text-red-400';
};

export function RunHistory() {
  const { user, firestore } = useFirebase();

  const runsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    const runsCollection = collection(firestore, 'users', user.uid, 'gauntlet_runs');
    return query(runsCollection, orderBy('timestamp', 'desc'));
  }, [user, firestore]);

  const { data: runs, isLoading } = useCollection<GauntletRun>(runsQuery);

  return (
    <Card className="mt-12">
      <CardHeader>
        <CardTitle>Run History</CardTitle>
        <CardDescription>Your past Gauntlet submissions.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && (!runs || runs.length === 0) && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-lg">You haven't run the Gauntlet yet.</p>
            <p className="text-sm">Upload a video to see your history.</p>
          </div>
        )}
        {!isLoading && runs && runs.length > 0 && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead className="text-right w-[100px]">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map(run => (
                  <TableRow key={run.id}>
                    <TableCell className="text-muted-foreground">
                      {run.timestamp ? format(run.timestamp.toDate(), 'PP') : 'Pending...'}
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-sm">{run.video_filename}</TableCell>
                    <TableCell className={cn("text-right font-bold", getScoreColor(run.survivability_score))}>
                      {run.survivability_score}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
