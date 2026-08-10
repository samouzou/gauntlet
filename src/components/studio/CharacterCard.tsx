'use client';

import Link from 'next/link';
import type { Character } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CharacterCard({
  character,
  href,
  index = 0,
  selected,
  onSelect,
}: {
  character: Character;
  href?: string;
  index?: number;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const initials = character.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const content = (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition-all duration-300',
        'hover:-translate-y-1 hover:border-primary/40',
        selected && 'border-primary ring-2 ring-primary/30',
        'animate-fade-up'
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
    >
      <div className="aspect-[4/5] overflow-hidden bg-secondary/50">
        {character.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.imageUrl}
            alt={character.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.35),transparent_55%),linear-gradient(160deg,hsl(var(--secondary)),hsl(var(--background)))]">
            <span className="font-display text-3xl font-semibold tracking-tight text-primary/90">
              {initials || '?'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="font-display text-lg font-semibold tracking-tight">{character.name}</p>
        <p className="text-xs text-white/70 mt-1 line-clamp-2">{character.description}</p>
        <p className="text-[11px] text-primary mt-2">
          {character.style}
          {!character.imageUrl ? ' · description only' : ''}
        </p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
