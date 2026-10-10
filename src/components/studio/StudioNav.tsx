'use client';

import {
  Clapperboard,
  Image as ImageIcon,
  Palette,
  Play,
  Users,
  History,
} from 'lucide-react';
import type { StudioPanel } from '@/lib/types';
import { cn } from '@/lib/utils';

const ITEMS: {
  id: StudioPanel;
  label: string;
  icon: typeof Clapperboard;
}[] = [
  { id: 'video', label: 'Video ad', icon: Clapperboard },
  { id: 'image', label: 'Image ad', icon: ImageIcon },
  { id: 'animate', label: 'Photo to video', icon: Play },
  { id: 'restyle', label: 'Remix', icon: Palette },
  { id: 'cast', label: 'Presenters', icon: Users },
  { id: 'reels', label: 'My ads', icon: History },
];

export function StudioNav({
  value,
  onChange,
}: {
  value: StudioPanel;
  onChange: (panel: StudioPanel) => void;
}) {
  return (
    <nav
      aria-label="Studio modes"
      className="flex lg:flex-col gap-1 p-1 rounded-xl border border-border/70 bg-card/40 overflow-x-auto lg:overflow-visible shrink-0"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 min-w-[4.25rem] lg:min-w-0 lg:w-[4.75rem] rounded-lg px-2.5 py-2.5 text-[11px] leading-tight text-center tracking-wide transition-colors',
              active
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
