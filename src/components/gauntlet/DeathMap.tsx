'use client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';

interface DeathPoint {
    timestamp: number;
    reason: string;
}

interface DeathMapProps {
    deathPoints: DeathPoint[];
    duration?: number;
}

export function DeathMap({ deathPoints, duration = 5000 }: DeathMapProps) {
    return (
        <div className="w-full">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">DEATH MAP / {duration/1000}s</h3>
            <TooltipProvider>
                <div className="relative h-4 w-full bg-secondary rounded-full">
                    {deathPoints.map((point, index) => {
                        const left = (point.timestamp / duration) * 100;
                        return (
                            <Tooltip key={index}>
                                <TooltipTrigger asChild>
                                    <div 
                                        className="absolute top-1/2 -translate-y-1/2" 
                                        style={{ left: `${left}%` }}
                                    >
                                        <AlertTriangle className="w-5 h-5 text-destructive cursor-pointer" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-bold">@{point.timestamp}ms: <span className="font-normal">{point.reason}</span></p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>
            </TooltipProvider>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0s</span>
                <span>{duration/1000}s</span>
            </div>
        </div>
    );
}
