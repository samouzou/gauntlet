'use client';

import { useEffect, useState } from 'react';
import { Globe, Image as ImageIcon, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { BrandAdIdea, BrandProfile, BrandProfileFields } from '@/lib/types';
import { cn } from '@/lib/utils';

const EMPTY_FIELDS: BrandProfileFields = {
  name: '',
  summary: '',
  offerings: [],
  audience: '',
  tone: '',
  visualStyle: '',
  offers: [],
  colors: { primary: '#1F2937', secondary: '#F3F4F6', accent: '#F59E0B' },
  logoUrl: null,
  applyToAds: true,
};

function fieldsFrom(brand: BrandProfile | null): BrandProfileFields {
  if (!brand) return EMPTY_FIELDS;
  const { websiteUrl, ideas, analysesToday, analysesPerDay, ...fields } = brand;
  return fields;
}

const splitLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export function WebsiteAnalyzer({
  initialUrl,
  isAnalyzing,
  onAnalyze,
}: {
  initialUrl?: string | null;
  isAnalyzing: boolean;
  onAnalyze: (url: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl || '');
  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) onAnalyze(url.trim());
      }}
    >
      <div className="relative flex-1">
        <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourbusiness.com"
          className="pl-9"
          inputMode="url"
          autoComplete="url"
          disabled={isAnalyzing}
        />
      </div>
      <Button type="submit" disabled={isAnalyzing || !url.trim()}>
        {isAnalyzing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {isAnalyzing ? 'Analyzing…' : 'Analyze my site'}
      </Button>
    </form>
  );
}

export function BrandIdeaList({
  ideas,
  disabled,
  onUseIdea,
  compact,
}: {
  ideas: BrandAdIdea[];
  disabled?: boolean;
  onUseIdea: (idea: BrandAdIdea) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn('grid gap-3', !compact && 'md:grid-cols-2')}>
      {ideas.map((idea) => (
        <div
          key={idea.id}
          className="flex flex-col rounded-xl border border-border/60 bg-secondary/20 p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-snug">{idea.title}</p>
            <span className="shrink-0 rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground">
              {idea.format === 'image'
                ? 'Image'
                : `${idea.length}s · ${idea.aspectRatio === '9:16' ? 'Vertical' : 'Wide'}`}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{idea.concept}</p>
          {!compact && idea.why && (
            <p className="mt-2 text-xs text-muted-foreground/80">
              <span className="text-primary">Why it works:</span> {idea.why}
            </p>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="mt-3 self-start"
            disabled={disabled}
            onClick={() => onUseIdea(idea)}
          >
            {idea.format === 'image' ? (
              <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Make this ad
          </Button>
        </div>
      ))}
    </div>
  );
}

export function BrandPanel({
  brand,
  isLoading,
  isAnalyzing,
  isSaving,
  disabled,
  onAnalyze,
  onSave,
  onUseIdea,
}: {
  brand: BrandProfile | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  isSaving: boolean;
  disabled?: boolean;
  onAnalyze: (url: string) => void;
  onSave: (fields: BrandProfileFields) => void;
  onUseIdea: (idea: BrandAdIdea) => void;
}) {
  const [fields, setFields] = useState<BrandProfileFields>(() => fieldsFrom(brand));
  const [offeringsText, setOfferingsText] = useState('');
  const [offersText, setOffersText] = useState('');
  const [editingByHand, setEditingByHand] = useState(false);

  useEffect(() => {
    const next = fieldsFrom(brand);
    setFields(next);
    setOfferingsText(next.offerings.join('\n'));
    setOffersText(next.offers.join('\n'));
  }, [brand]);

  const set = <K extends keyof BrandProfileFields>(key: K, value: BrandProfileFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const showForm = Boolean(brand) || editingByHand;
  const remaining =
    brand?.analysesPerDay != null ? brand.analysesPerDay - (brand.analysesToday || 0) : null;

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card/50 to-card/30">
        <CardHeader className="pb-3">
          <CardTitle className="font-display flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {brand ? 'Re-analyze your website' : 'Start with your website'}
          </CardTitle>
          <CardDescription>
            We read your site, build your brand profile, and recommend the first ads to make. Free,
            takes about 20 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <WebsiteAnalyzer
            initialUrl={brand?.websiteUrl}
            isAnalyzing={isAnalyzing}
            onAnalyze={onAnalyze}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {remaining != null && brand
                ? `${Math.max(0, remaining)} of ${brand.analysesPerDay} analyses left today`
                : 'Your homepage is enough.'}
            </span>
            {!showForm && (
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setEditingByHand(true)}
              >
                No website? Fill it in by hand
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && !brand && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your brand…
        </div>
      )}

      {brand && brand.ideas.length > 0 && (
        <Card className="border-border/70 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recommended ads for {brand.name}
            </CardTitle>
            <CardDescription>
              Written for your business from your website. Pick one to load it into the studio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BrandIdeaList ideas={brand.ideas} disabled={disabled} onUseIdea={onUseIdea} />
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="border-border/70 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-display">Brand profile</CardTitle>
            <CardDescription>
              Edit anything that’s off. These details shape every ad you make.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Brand name</Label>
                <Input
                  id="brand-name"
                  value={fields.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Corner Crumb Bakery"
                />
              </div>
              {fields.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fields.logoUrl}
                  alt=""
                  className="h-16 w-16 self-end rounded-lg border border-border/60 bg-white object-contain p-1"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-summary">What you sell</Label>
              <Textarea
                id="brand-summary"
                rows={2}
                value={fields.summary}
                onChange={(e) => set('summary', e.target.value)}
                placeholder="Fresh-baked pastries and specialty coffee for the neighborhood."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand-offerings">Products or services (one per line)</Label>
                <Textarea
                  id="brand-offerings"
                  rows={4}
                  value={offeringsText}
                  onChange={(e) => setOfferingsText(e.target.value)}
                  placeholder={'Croissants\nOat milk lattes\nCustom cakes'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-offers">Current offers (one per line)</Label>
                <Textarea
                  id="brand-offers"
                  rows={4}
                  value={offersText}
                  onChange={(e) => setOffersText(e.target.value)}
                  placeholder={'Free coffee with any pastry before 8am'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-audience">Who it’s for</Label>
              <Input
                id="brand-audience"
                value={fields.audience}
                onChange={(e) => set('audience', e.target.value)}
                placeholder="Commuters and young families in the neighborhood"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand-tone">Tone</Label>
                <Input
                  id="brand-tone"
                  value={fields.tone}
                  onChange={(e) => set('tone', e.target.value)}
                  placeholder="Warm, cozy, unpretentious"
                />
              </div>
              <div className="space-y-2">
                <Label>Brand colors</Label>
                <div className="flex gap-2">
                  {(['primary', 'secondary', 'accent'] as const).map((key) => (
                    <label
                      key={key}
                      className="flex flex-1 items-center gap-2 rounded-md border border-input px-2 py-1.5 text-xs text-muted-foreground"
                    >
                      <input
                        type="color"
                        value={fields.colors[key]}
                        onChange={(e) =>
                          set('colors', { ...fields.colors, [key]: e.target.value.toUpperCase() })
                        }
                        className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                        aria-label={`${key} color`}
                      />
                      <span className="capitalize">{key}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-style">Look and feel</Label>
              <Textarea
                id="brand-style"
                rows={2}
                value={fields.visualStyle}
                onChange={(e) => set('visualStyle', e.target.value)}
                placeholder="Sunny, golden-hour interiors, warm wood and cream tones, handheld and intimate."
              />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/20 p-3 text-sm">
              <input
                type="checkbox"
                checked={fields.applyToAds}
                onChange={(e) => set('applyToAds', e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span>
                <span className="font-medium">Apply my brand to every ad</span>
                <span className="block text-xs text-muted-foreground">
                  Adds your look, tone and colors to each video and image you generate.
                </span>
              </span>
            </label>

            <Button
              className="w-full"
              disabled={isSaving || !fields.name.trim()}
              onClick={() =>
                onSave({
                  ...fields,
                  offerings: splitLines(offeringsText),
                  offers: splitLines(offersText),
                })
              }
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save brand
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
