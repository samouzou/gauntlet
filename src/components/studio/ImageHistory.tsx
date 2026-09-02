'use client';

import type { StudioImage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

function sortKey(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toMillis' in value) {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  return 0;
}

export function ImageHistory({
  images,
  activeImageId,
  isLoading,
  onSelect,
}: {
  images: StudioImage[];
  activeImageId?: string | null;
  isLoading?: boolean;
  onSelect: (image: StudioImage) => void;
}) {
  const sorted = [...images].sort(
    (a, b) => sortKey(b.updatedAt ?? b.createdAt) - sortKey(a.updatedAt ?? a.createdAt)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-card/20 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Stills you create will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {sorted.map((image) => {
        const active = image.id === activeImageId;
        return (
          <button
            key={image.id}
            type="button"
            onClick={() => onSelect(image)}
            className={cn(
              'group overflow-hidden rounded-xl border text-left transition-colors',
              active
                ? 'border-primary/60 ring-1 ring-primary/40'
                : 'border-border/60 hover:border-border'
            )}
          >
            <div className="aspect-square bg-secondary/40 overflow-hidden">
              {image.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                  No preview
                </div>
              )}
            </div>
            <div className="px-2.5 py-2">
              <p className="text-xs font-medium truncate">{image.title || 'Untitled'}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {image.mode === 'image_to_image' ? 'Restyle' : 'Image'}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
