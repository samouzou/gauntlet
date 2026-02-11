'use client';
import type { GauntletOutput } from "@/ai/flows/gauntlet-run-flow";
import { Logo } from "@/components/logo";

interface StoryResultProps {
    result: GauntletOutput;
}

export function StoryResult({ result }: StoryResultProps) {
    const scoreColor = result.survivability_score > 75 ? 'text-green-400' : result.survivability_score > 50 ? 'text-amber-400' : 'text-red-400';

    return (
        <div className="relative aspect-[9/16] w-[320px] bg-background border-4 border-primary/50 rounded-2xl p-8 flex flex-col items-center justify-between text-center text-white overflow-hidden shadow-2xl shadow-primary/20">
            <div className="flex flex-col items-center gap-2">
              <Logo className="w-12 h-12 text-primary" />
              <p className="text-lg font-semibold tracking-wider">THE GAUNTLET</p>
            </div>

            <div className="flex flex-col items-center justify-center">
                <p className="font-mono text-sm tracking-widest text-muted-foreground">SURVIVABILITY</p>
                <p className={`font-bold text-8xl ${scoreColor}`}>{result.survivability_score}<span className="text-7xl">%</span></p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full text-center">
                <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Visual Hook</p>
                    <p className="text-3xl font-bold">{result.visual_hook_score}<span className="text-xl text-muted-foreground">/10</span></p>
                </div>
                 <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Audio Hook</p>
                    <p className="text-3xl font-bold">{result.audio_hook_score}<span className="text-xl text-muted-foreground">/10</span></p>
                </div>
            </div>
        </div>
    )
}
