'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function SimulationView() {
  const agents = Array.from({ length: 9 });

  return (
    <div className="flex flex-col items-center justify-center text-center p-4 animate-in fade-in-50 duration-500">
        <Card className="max-w-lg bg-zinc-900/50 border-zinc-800">
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin h-5 w-5" />
                    SIMULATION IN PROGRESS
                </CardTitle>
                <CardDescription>
                    Deploying 10,000 hyper-distracted agents...
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-3 gap-2">
                    {agents.map((_, i) => (
                        <div key={i} className="w-20 h-20 bg-secondary rounded-md flex items-center justify-center animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                            <p className="text-xs text-muted-foreground">AGENT #{Math.floor(Math.random() * 10000)}</p>
                        </div>
                    ))}
                 </div>
                 <p className="text-xs text-muted-foreground mt-4 animate-pulse">ANALYZING ATTENTION VECTORS...</p>
            </CardContent>
        </Card>
    </div>
  );
}
