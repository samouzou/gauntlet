'use client';

import type { Scene } from '@/lib/types';
import { formatSceneWhen, sceneSortKey } from '@/lib/studio/scene-time';
import { cn } from '@/lib/utils';
import { Film, Loader2 } from 'lucide-react';

export function SceneHistory({
  scenes,
  activeSceneId,
  isLoading,
  onSelect,
}: {
  scenes: Scene[];
  activeSceneId?: string | null;
  isLoading?: boolean;
  onSelect: (scene: Scene) => void;
}) {
  const sorted = [...scenes].sort((a, b) => sceneSortKey(b) - sceneSortKey(a));

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Gathering your reels…
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nothing here yet — shoot a scene above and it will land in this shelf.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {sorted.map((scene, index) => {
        const preview = scene.videoUrl || scene.thumbnailUrl || null;
        const when = formatSceneWhen(scene.updatedAt || scene.createdAt);
        const isActive = activeSceneId === scene.id;

        return (
          <button
            key={scene.id}
            type="button"
            onClick={() => onSelect(scene)}
            className={cn(
              'group text-left overflow-hidden rounded-xl border bg-card/40 transition-all duration-300',
              'hover:-translate-y-0.5 hover:border-primary/40',
              'animate-fade-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              isActive ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border/60'
            )}
            style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
          >
            <div className="relative aspect-video bg-secondary/40 overflow-hidden">
              {preview?.match(/\.(mp4|webm|mov)(\?|$)/i) ||
              (scene.videoUrl && preview === scene.videoUrl) ? (
                <video
                  src={preview}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  <Film className="h-6 w-6 opacity-50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="font-display text-sm font-semibold tracking-tight line-clamp-1">
                  {scene.title || 'Untitled scene'}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-white/65">
                  <span className="truncate">{when}</span>
                  {scene.status === 'error' ? (
                    <span className="shrink-0 text-destructive-foreground/90">Failed</span>
                  ) : isActive ? (
                    <span className="shrink-0 text-primary">Open</span>
                  ) : null}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
