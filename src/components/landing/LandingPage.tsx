'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Building2,
  Check,
  Clapperboard,
  Film,
  ImageIcon,
  Megaphone,
  MonitorSmartphone,
  Palette,
  Rocket,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  UserRound,
  UtensilsCrossed,
  Users,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MARKETING_EXAMPLES, MarketingFeed, PhoneClip } from '@/components/landing/MarketingFeed';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

const ACCENT_TEXT = 'bg-gradient-to-r from-primary via-fuchsia-400 to-sky-400 bg-clip-text text-transparent';

const PLACEMENTS = ['Instagram Reels', 'TikTok', 'YouTube Shorts', 'Facebook Ads', 'Instagram Stories', 'Your website'];

const FACTS = [
  { value: '10–40s', label: 'Video ad lengths' },
  { value: '9:16 & 16:9', label: 'Vertical and widescreen' },
  { value: '1 brief', label: 'From one paragraph to a finished ad' },
  { value: '20 free', label: 'Credits to make your first ads' },
];

const FORMATS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Film,
    title: 'Video ads',
    body: 'Product spots, offers and launches shot from a short brief. Pick 10, 20, 30 or 40 seconds.',
  },
  {
    icon: UserRound,
    title: 'UGC-style ads',
    body: 'Selfie-style creator videos with AI presenters you save once and reuse in every campaign.',
  },
  {
    icon: ImageIcon,
    title: 'Image ads',
    body: 'Static creatives for feeds, stories and display. Generate from text or remix a product photo.',
  },
  {
    icon: Wand2,
    title: 'Animated product shots',
    body: 'Turn a still product photo into a moving ad: pours, spins, reveals and lifestyle moments.',
  },
  {
    icon: Palette,
    title: 'Restyled footage',
    body: 'Upload a clip you already have and give it a new look, season or setting for a fresh variation.',
  },
  {
    icon: Clapperboard,
    title: 'Longer spots',
    body: 'Extend any ad ten seconds at a time. The same people, product and look carry through.',
  },
];

const AUDIENCES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ShoppingBag, title: 'E-commerce & DTC', body: 'Fresh product creatives for every drop and every sale.' },
  { icon: Megaphone, title: 'Agencies & freelancers', body: 'Ship more ad variations per client without a shoot.' },
  { icon: Store, title: 'Local businesses', body: 'Promos for restaurants, clinics, salons, gyms and trades.' },
  { icon: Rocket, title: 'Apps & SaaS', body: 'Launch videos and explainers for paid social.' },
  { icon: Users, title: 'Creators & coaches', body: 'Promote offers, courses and events with on-brand video.' },
  { icon: UtensilsCrossed, title: 'Hospitality', body: 'Menus, rooms and events that make people book.' },
];

const STEPS = [
  {
    title: 'Write the brief',
    body: 'Your product, your offer and the feeling you want. One plain-language paragraph.',
  },
  {
    title: 'Generate the ad',
    body: 'Choose the format and length. Reelwright shoots it, with optional AI presenters.',
  },
  {
    title: 'Launch it',
    body: 'Download the MP4 or image and post it organically or run it as a paid ad.',
  },
];

// Must match the Stripe prices behind CREDIT_PACKS in src/lib/studio/credit-packs.ts.
const PACKS = [
  { credits: 60, price: 18, note: 'Six 10-second ads' },
  { credits: 200, price: 55, note: 'Twenty 10-second ads', featured: true },
  { credits: 600, price: 150, note: 'Fifteen 40-second spots' },
];

const FAQ = [
  {
    q: `What is ${BRAND.name}?`,
    a: `${BRAND.name} is an AI ad generator. Describe your product or offer and it creates video ads, UGC-style ads and image ads ready for social media and paid campaigns.`,
  },
  {
    q: 'Where can I use the ads?',
    a: 'Anywhere that takes video or images: Instagram Reels and Stories, TikTok, YouTube Shorts, Facebook and Instagram ads, landing pages and email. You download a standard MP4 or image file.',
  },
  {
    q: 'How long can a video ad be?',
    a: 'Choose 10, 20, 30 or 40 seconds when you generate. You can also extend a finished ad ten seconds at a time.',
  },
  {
    q: 'Can the same presenter appear in all my ads?',
    a: 'Yes. Save a presenter or mascot once with a photo or description, then cast them in any ad so your campaigns stay consistent.',
  },
  {
    q: 'How does pricing work?',
    a: 'You pay with credits. One credit is one second of video, and an image ad costs one credit. New accounts get 20 free credits, and packs are one-time purchases with no subscription.',
  },
  {
    q: 'Do I need design or editing skills?',
    a: 'No. If you can describe the ad in a sentence or two, you can make it.',
  },
];

function SectionHeading({
  eyebrow,
  title,
  accent,
  body,
  center = true,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  body?: string;
  center?: boolean;
}) {
  return (
    <div className={cn('mb-10', center && 'text-center mx-auto max-w-2xl')}>
      <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">{eyebrow}</p>
      <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        {title} {accent && <span className={ACCENT_TEXT}>{accent}</span>}
      </h2>
      {body && <p className="text-muted-foreground mt-3 text-sm sm:text-base">{body}</p>}
    </div>
  );
}

function CreateButton({ children = 'Create your ad free' }: { children?: ReactNode }) {
  return (
    <Button asChild size="lg" className="px-8 shadow-lg shadow-primary/25">
      <Link href="/studio">
        {children}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  );
}

export function LandingPage() {
  const ugcExample = MARKETING_EXAMPLES.find((e) => e.slug === 'dental-office') ?? MARKETING_EXAMPLES[0];

  return (
    <div className="w-full">
      <section className="relative flex flex-col items-center text-center px-4 pt-20 pb-14 sm:pt-28 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[30%] h-[520px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl animate-soft-pulse" />
          <div className="absolute right-[6%] top-[12%] h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl" />
          <div className="absolute left-[6%] top-[40%] h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary animate-fade-up">
          <Sparkles className="h-3.5 w-3.5" />
          AI ad generator
        </span>
        <h1 className="mt-6 max-w-4xl font-display text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05] animate-fade-up [animation-delay:60ms]">
          The AI ad generator for <span className={ACCENT_TEXT}>video, UGC & image ads</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground animate-fade-up [animation-delay:120ms]">
          Describe your product or offer. {BRAND.name} creates scroll-stopping ads for Reels, TikTok,
          Shorts and Meta in minutes. No camera, no crew, no editing.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-up [animation-delay:180ms]">
          <CreateButton />
          <Button asChild size="lg" variant="outline">
            <a href="#examples">See example ads</a>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground animate-fade-up [animation-delay:220ms]">
          20 free credits when you sign up · No subscription
        </p>

        <div className="mt-14 w-full max-w-4xl animate-fade-up [animation-delay:260ms]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-4">
            Ready for every placement
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-muted-foreground/80">
            {PLACEMENTS.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="examples" className="max-w-6xl mx-auto px-4 sm:px-0 mb-24 scroll-mt-20">
        <SectionHeading
          eyebrow={`Made with ${BRAND.name}`}
          title="Make an ad video"
          accent="in your brand's style"
          body="Every ad below was generated from a one-paragraph brief. Pick one, swap in your product, and launch it today."
        />
        <MarketingFeed />
        <div className="mt-10 flex justify-center">
          <CreateButton>Make your ad</CreateButton>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-0 mb-24">
        <div className="rounded-3xl border border-border/60 bg-card/40 px-6 py-10 sm:px-10">
          <h2 className="text-center font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            Ad creative on demand, <span className={ACCENT_TEXT}>without the production budget</span>
          </h2>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {FACTS.map((f) => (
              <div key={f.label}>
                <p className={cn('font-display text-3xl sm:text-4xl font-semibold tracking-tight', ACCENT_TEXT)}>
                  {f.value}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="formats" className="max-w-6xl mx-auto px-4 sm:px-0 mb-24 scroll-mt-20">
        <SectionHeading
          eyebrow="Ad formats"
          title="Every format your campaigns need,"
          accent="from one studio"
          body="Test more creative, faster. Generate a variation for every audience, offer and placement."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FORMATS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border/60 bg-card/40 p-6 transition-colors hover:border-primary/50 hover:bg-card/70"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold tracking-tight">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-0 mb-24">
        <div className="grid items-center gap-12 rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/40 to-fuchsia-500/10 p-6 sm:p-12 md:grid-cols-[minmax(0,260px)_1fr]">
          <div className="mx-auto w-[230px] md:w-full">
            <PhoneClip example={ugcExample} index={0} showCaption={false} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">UGC ads</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              UGC ads that feel native, <span className={ACCENT_TEXT}>without hiring creators</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Authentic, phone-shot ads are what people stop scrolling for. Create them on demand
              and keep the same face across every campaign.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                'Save an AI presenter or mascot once, reuse them in every ad',
                'Selfie-style, testimonial and product-demo looks',
                'Vertical 9:16 built for Reels, TikTok and Shorts',
                'Make variations of a winning ad in minutes',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <CreateButton>Create a UGC ad</CreateButton>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-0 mb-24">
        <SectionHeading
          eyebrow="Who it's for"
          title="Built for anyone who"
          accent="needs ads that sell"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-border/60 bg-card/40 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-0 mb-24">
        <SectionHeading eyebrow="How it works" title="From idea to ad" accent="in three steps" />
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative rounded-2xl border border-border/60 bg-card/40 p-6">
              <p className={cn('font-display text-4xl font-semibold', ACCENT_TEXT)}>0{i + 1}</p>
              <p className="mt-3 font-display text-lg font-semibold tracking-tight">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Smartphone className="h-4 w-4" /> Vertical for social
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MonitorSmartphone className="h-4 w-4" /> Widescreen for YouTube and web
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-4 w-4" /> Standard MP4 and image downloads
          </span>
        </div>
      </section>

      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-0 mb-24 scroll-mt-20">
        <SectionHeading
          eyebrow="Pricing"
          title="Pay per ad,"
          accent="not per month"
          body="One credit is one second of video. Image ads are one credit each. Start with 20 free credits."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {PACKS.map((pack) => (
            <div
              key={pack.credits}
              className={cn(
                'relative rounded-2xl border bg-card/40 p-6 flex flex-col',
                pack.featured ? 'border-primary shadow-xl shadow-primary/15' : 'border-border/60'
              )}
            >
              {pack.featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <p className="text-sm text-muted-foreground">{pack.credits} credits</p>
              <p className="mt-2 font-display text-4xl font-semibold tracking-tight">${pack.price}</p>
              <p className="mt-1 text-sm text-muted-foreground">{pack.note}</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                ${(pack.price / pack.credits).toFixed(2)} per second of video
              </p>
              <Button asChild className="mt-6" variant={pack.featured ? 'default' : 'outline'}>
                <Link href="/studio">Get started</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          One-time purchases. No subscription.
        </p>
      </section>

      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-0 mb-24 scroll-mt-20">
        <SectionHeading eyebrow="FAQ" title="Questions," accent="answered" />
        <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/40">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-muted-foreground transition-transform group-open:rotate-45 text-xl leading-none">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-0 mb-24">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/25 via-fuchsia-500/15 to-sky-500/15 px-6 py-14 text-center">
          <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight">
            Your next ad is one sentence away
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Describe it, generate it, launch it. Start free with 20 credits.
          </p>
          <div className="mt-8 flex justify-center">
            <CreateButton />
          </div>
        </div>
      </section>
    </div>
  );
}
