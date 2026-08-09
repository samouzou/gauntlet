'use client';

import Link from 'next/link';
import type { Scene } from '@/lib/types';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SceneCard({
  scene,
  href,
  index = 0,
  onSelect,
}: {
  scene: Scene;
  href?: string;
  index?: number;
  onSelect?: () => void;
}) {
  const content = (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition-all duration-300',
        'hover:-translate-y-1 hover:border-primary/40',
        'animate-fade-up'
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
    >
      <div className="aspect-video overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={scene.thumbnailUrl}
          alt={scene.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
            <Play className="h-5 w-5 ml-0.5" />
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="font-display text-lg font-semibold tracking-tight">{scene.title}</p>
        <p className="text-xs text-white/70 mt-1 line-clamp-2">{scene.prompt}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
