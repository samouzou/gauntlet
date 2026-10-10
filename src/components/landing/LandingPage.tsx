'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CharacterCard } from '@/components/studio/CharacterCard';
import { SceneCard } from '@/components/studio/SceneCard';
import { MarketingFeed } from '@/components/landing/MarketingFeed';
import { SAMPLE_CHARACTERS, SAMPLE_SCENES } from '@/lib/studio/samples';
import { BRAND } from '@/lib/brand';
import { ArrowRight } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="w-full">
      <section className="relative min-h-[78vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[28%] h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl animate-soft-pulse" />
          <div className="absolute right-[8%] top-[18%] h-48 w-48 rounded-full bg-sky-500/10 blur-2xl" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage: 'radial-gradient(ellipse at center, black 15%, transparent 70%)',
            }}
          />
        </div>

        <p className="font-display text-5xl sm:text-7xl md:text-8xl font-semibold tracking-tight animate-fade-up">
          Reelwright
        </p>
        <h1 className="mt-4 max-w-2xl text-xl sm:text-2xl text-muted-foreground font-normal animate-fade-up [animation-delay:70ms]">
          The video marketing tool for small businesses.
        </h1>
        <p className="mt-3 max-w-xl text-sm sm:text-base text-muted-foreground/90 animate-fade-up [animation-delay:130ms]">
          Restaurants, clinics, salons and local shops: describe your promo in a sentence and get
          a 10 to 40 second video for Reels, TikTok and Shorts in minutes. No film crew.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-up [animation-delay:190ms]">
          <Button asChild size="lg" className="px-8">
            <Link href="/studio">
              Make your first video
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#examples">See examples</a>
          </Button>
        </div>
      </section>

      <section id="examples" className="max-w-6xl mx-auto px-4 sm:px-0 mb-24">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Made with {BRAND.name}</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Promos for the businesses on your block
          </h2>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
            Every clip below came from a one-paragraph description. Pick one, swap in your
            business, and post it the same day.
          </p>
        </div>
        <MarketingFeed />
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-0 mb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Describe the promo',
              body: 'The dish, the service, the offer, the vibe. Plain words, one paragraph.',
            },
            {
              title: 'Pick a length',
              body: '10, 20, 30 or 40 seconds, vertical or widescreen. Extend any take 10 seconds at a time.',
            },
            {
              title: 'Post everywhere',
              body: 'Download the MP4 and drop it into Instagram, TikTok, YouTube Shorts or your website.',
            },
          ].map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <p className="text-xs text-primary font-semibold">0{i + 1}</p>
              <p className="mt-2 font-display text-lg font-semibold tracking-tight">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="characters" className="max-w-6xl mx-auto px-2 sm:px-0 mb-20">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Recurring faces</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Keep a familiar face</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Save a character — your chef, your stylist, your mascot — and bring them back in every
              video.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SAMPLE_CHARACTERS.map((character, index) => (
            <CharacterCard
              key={character.id}
              character={character}
              index={index}
              href={`/studio?character=${character.id}`}
            />
          ))}
        </div>
      </section>

      <section id="scenes" className="max-w-6xl mx-auto px-2 sm:px-0 mb-24">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Scenes</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Keep the story going</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Open a scene, change the mood, or extend it into a longer spot.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SAMPLE_SCENES.map((scene, index) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              index={index}
              href={`/studio?scene=${scene.id}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
