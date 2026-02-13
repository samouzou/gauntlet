'use client';

import { useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { GauntletOutput } from '@/ai/flows/gauntlet-run-flow';
import { DeathMap } from './DeathMap';
import { Download, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { StoryResult } from './StoryResult';
import { useToast } from '@/hooks/use-toast';


interface ResultScreenProps {
  result: GauntletOutput;
  onReset: () => void;
}

export function ResultScreen({ result, onReset }: ResultScreenProps) {
  const scoreColor = result.survivability_score > 75 ? 'text-green-400' : result.survivability_score > 50 ? 'text-amber-400' : 'text-red-400';

  const storyRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleDownloadImage = useCallback(() => {
    if (storyRef.current === null) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not find the story element to capture.',
      });
      return;
    }

    toPng(storyRef.current, { cacheBust: true, pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'gauntlet-result.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to generate image:', err);
        toast({
          variant: "destructive",
          title: "Image Generation Failed",
          description: "Could not create the shareable image. Please try again."
        });
      });
  }, [storyRef, toast]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50 duration-500">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-center text-sm font-medium tracking-widest text-muted-foreground">
            SURVIVABILITY SCORE
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className={`text-7xl font-bold ${scoreColor}`}>{result.survivability_score}%</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Visual Hook</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{result.visual_hook_score}<span className="text-xl text-muted-foreground">/10</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Audio/Text Hook</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{result.audio_hook_score}<span className="text-xl text-muted-foreground">/10</span></p>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Failures</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-4xl font-bold">{result.death_points.length}</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="text-lg">Attention Analysis</CardTitle>
        </CardHeader>
        <CardContent>
            <DeathMap deathPoints={result.death_points} />
            <Separator className="my-6" />
            <ul className="space-y-4">
                {result.death_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-4 text-sm">
                        <span className="font-mono text-muted-foreground pt-0.5">@{point.timestamp}ms</span>
                        <p className="flex-1">{point.reason}</p>
                    </li>
                ))}
            </ul>
        </CardContent>
      </Card>
      
      <div className="flex justify-center gap-4">
        <Button onClick={onReset} variant="secondary">Run Another Hook</Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
                <Share2 className="mr-2 h-4 w-4" />
                Share to Story
            </Button>
          </DialogTrigger>
          <DialogContent className="w-auto p-0 bg-transparent border-none shadow-none">
             <DialogHeader className="sr-only">
                <DialogTitle>Share Results</DialogTitle>
                <DialogDescription>
                    Your result formatted for a social media story. Download the image below to share.
                </DialogDescription>
             </DialogHeader>
             <div ref={storyRef}>
                <StoryResult result={result} />
             </div>
             <DialogFooter className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <Button onClick={handleDownloadImage} size="lg">
                    <Download className="mr-2 h-5 w-5" />
                    Download
                </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
