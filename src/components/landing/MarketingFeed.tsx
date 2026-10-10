'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Heart,
  MessageCircle,
  Music2,
  Plus,
  Send,
  Share2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Platform = 'reels' | 'tiktok';

export interface MarketingExample {
  slug: string;
  business: string;
  handle: string;
  category: string;
  caption: string;
  audio: string;
  likes: string;
  comments: string;
  platform: Platform;
  tint: string;
  prompt: string;
}

export const MARKETING_EXAMPLES: MarketingExample[] = [
  {
    slug: 'restaurant-tacos',
    business: 'La Esquina Taqueria',
    handle: 'laesquina.tacos',
    category: 'Restaurant',
    caption: 'Taco Tuesday is back. 3 for $9 all night. Tag who’s coming with you.',
    audio: 'Original audio · Cumbia Nights',
    likes: '12.4K',
    comments: '318',
    platform: 'reels',
    tint: 'from-orange-500/40 to-red-700/40',
    prompt:
      'Vertical promo video for a neighborhood taqueria. Close-up of sizzling carne asada on a flat-top grill, a cook folds fresh tortillas, then a colorful plate of three tacos with lime and cilantro slides across a wooden counter toward the camera. Warm evening light, lively restaurant ambience, upbeat Latin guitar music. Handheld, appetizing food-commercial style. No text on screen. No dialogue.',
  },
  {
    slug: 'dental-office',
    business: 'Brightside Family Dental',
    handle: 'brightsidedental',
    category: 'Healthcare',
    caption: 'New patients welcome. Same-week cleanings, gentle care for the whole family.',
    audio: 'Brightside Family Dental · Original sound',
    likes: '2,031',
    comments: '87',
    platform: 'tiktok',
    tint: 'from-teal-400/40 to-sky-700/40',
    prompt:
      'Vertical promo video for a friendly family dental clinic. A bright, modern, spotless treatment room; a smiling dental hygienist in teal scrubs welcomes a relaxed adult patient into the chair; slow push-in on a calm, reassuring moment; ends on a clean reception desk with plants. Soft natural daylight, gentle acoustic music. Trustworthy, warm healthcare commercial style. No text on screen. No dialogue.',
  },
  {
    slug: 'hair-salon',
    business: 'Copper & Co. Salon',
    handle: 'copperandco.salon',
    category: 'Beauty',
    caption: 'Fall color season is here. Book your copper glow — link in bio.',
    audio: 'Original audio · Golden Hour',
    likes: '8,960',
    comments: '204',
    platform: 'reels',
    tint: 'from-amber-500/40 to-rose-700/40',
    prompt:
      'Vertical promo video for a local hair salon. A stylist applies warm copper hair color with a brush, then a slow-motion hair flip reveals glossy finished color in front of a big round mirror with warm bulbs. Cozy boutique interior, golden light, chill pop music. Beauty commercial style. No text on screen. No dialogue.',
  },
  {
    slug: 'coffee-bakery',
    business: 'Corner Crumb Bakery',
    handle: 'cornercrumb',
    category: 'Café',
    caption: 'Fresh out of the oven at 7am. Your morning just got better.',
    audio: 'Corner Crumb · Morning Jazz',
    likes: '5,412',
    comments: '142',
    platform: 'tiktok',
    tint: 'from-yellow-500/40 to-orange-800/40',
    prompt:
      'Vertical promo video for a small corner bakery and coffee shop. Croissants coming out of the oven golden and flaky, a barista pours latte art in slow motion, a customer picks up a paper bag of pastries at the counter by a sunny window. Morning light, soft cafe ambience, light jazz. Cozy, inviting small-business style. No text on screen. No dialogue.',
  },
  {
    slug: 'fitness-studio',
    business: 'Forge Fitness',
    handle: 'forgefitness.studio',
    category: 'Fitness',
    caption: 'New member week. First class free. No experience needed — just show up.',
    audio: 'Original audio · Pulse',
    likes: '9,875',
    comments: '263',
    platform: 'reels',
    tint: 'from-violet-500/40 to-fuchsia-800/40',
    prompt:
      'Vertical promo video for a neighborhood fitness studio. Energetic group class doing kettlebell swings, a coach gives a high-five, close-ups of determined faces and chalked hands, ends on a wide shot of the bright studio. Punchy electronic music, dynamic handheld camera. Motivational fitness commercial style. No text on screen. No dialogue.',
  },
  {
    slug: 'home-plumbing',
    business: 'Reyes Family Plumbing',
    handle: 'reyesplumbing',
    category: 'Home services',
    caption: 'Leaky sink? We’ll be there today. Family-owned, upfront pricing.',
    audio: 'Reyes Family Plumbing · Original sound',
    likes: '3,307',
    comments: '96',
    platform: 'tiktok',
    tint: 'from-blue-500/40 to-indigo-800/40',
    prompt:
      'Vertical promo video for a local family-owned plumbing service. A friendly plumber in a clean navy uniform arrives at a suburban front door with a toolbox, fixes a kitchen sink under bright lights, then the homeowner happily runs clear water from the faucet. Bright daylight, reassuring upbeat acoustic music. Clean local-services commercial style. No text on screen. No dialogue.',
  },
];

function useInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.35,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

function PhoneClip({ example, index }: { example: MarketingExample; index: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const isTikTok = example.platform === 'tiktok';

  useEffect(() => {
    const video = videoRef.current;
    if (!video || failed) return;
    if (inView) void video.play().catch(() => {});
    else video.pause();
  }, [inView, failed, loaded]);

  return (
    <div
      ref={ref}
      className="animate-fade-up snap-center shrink-0 w-[230px] sm:w-[250px] lg:w-auto"
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
    >
      <div className="relative rounded-[2.2rem] border-[6px] border-neutral-800 bg-black shadow-2xl shadow-black/50 overflow-hidden aspect-[9/19]">
        <div className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />

        <div className={cn('absolute inset-0 bg-gradient-to-br', example.tint)} />
        {!failed && (
          <video
            ref={videoRef}
            src={inView || loaded ? `/samples/marketing/${example.slug}.mp4` : undefined}
            muted
            loop
            playsInline
            preload="none"
            onLoadedData={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
              loaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

        <div className="absolute inset-x-0 top-8 z-10 flex items-center justify-center gap-4 text-[11px] font-semibold text-white">
          {isTikTok ? (
            <>
              <span className="text-white/60">Following</span>
              <span className="border-b-2 border-white pb-0.5">For You</span>
            </>
          ) : (
            <span className="text-sm">Reels</span>
          )}
        </div>

        <div className="absolute right-2 bottom-24 z-10 flex flex-col items-center gap-3 text-white">
          <div className="flex flex-col items-center">
            <Heart className={cn('h-5 w-5', isTikTok && 'fill-white')} />
            <span className="text-[9px] mt-0.5">{example.likes}</span>
          </div>
          <div className="flex flex-col items-center">
            <MessageCircle className={cn('h-5 w-5', isTikTok && 'fill-white')} />
            <span className="text-[9px] mt-0.5">{example.comments}</span>
          </div>
          {isTikTok ? (
            <>
              <Bookmark className="h-5 w-5 fill-white" />
              <Share2 className="h-5 w-5" />
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              <Bookmark className="h-5 w-5" />
            </>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 p-3 pr-10 text-white">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="relative h-6 w-6 shrink-0 rounded-full bg-white/25 border border-white/60 flex items-center justify-center text-[10px] font-bold">
              {example.business[0]}
              {isTikTok && (
                <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-rose-500 flex items-center justify-center">
                  <Plus className="h-2 w-2" />
                </span>
              )}
            </div>
            <span className="text-xs font-semibold truncate">
              {isTikTok ? `@${example.handle}` : example.handle}
            </span>
            {!isTikTok && (
              <span className="shrink-0 rounded-md border border-white/70 px-1 py-0.5 text-[9px] font-semibold">
                Follow
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug line-clamp-2">{example.caption}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-white/85">
            <Music2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{example.audio}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 px-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-primary">{example.category}</p>
        <p className="text-sm font-medium leading-snug">{example.business}</p>
        <Link
          href={`/studio?${new URLSearchParams({ prompt: example.prompt, ratio: '9:16' })}`}
          className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Make one like this
        </Link>
      </div>
    </div>
  );
}

export function MarketingFeed() {
  return (
    <div className="-mx-4 px-4 flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 [scrollbar-width:thin] lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible xl:grid-cols-6 xl:gap-4">
      {MARKETING_EXAMPLES.map((example, index) => (
        <PhoneClip key={example.slug} example={example} index={index} />
      ))}
    </div>
  );
}
