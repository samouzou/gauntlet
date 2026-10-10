'use client';

import { LayoutTemplate } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MARKETING_EXAMPLES, type MarketingExample } from '@/components/landing/MarketingFeed';
import { AD_TEMPLATES, type AdTemplate, type AdTemplatePanel } from '@/lib/studio/ad-templates';

export function AdTemplates({
  panel,
  disabled,
  onPickTemplate,
  onPickExample,
}: {
  panel: AdTemplatePanel;
  disabled?: boolean;
  onPickTemplate: (template: AdTemplate) => void;
  onPickExample?: (example: MarketingExample) => void;
}) {
  const templates = AD_TEMPLATES.filter((t) => t.panel === panel);

  return (
    <Card className="border-border/60 bg-card/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          Start from a template
        </CardTitle>
        <CardDescription>Pick one, then swap the [bracketed] parts for your business.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              disabled={disabled}
              onClick={() => onPickTemplate(template)}
              className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-60"
            >
              <p className="text-sm font-medium">{template.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{template.blurb}</p>
            </button>
          ))}
        </div>

        {onPickExample && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Or remake an example
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
              {MARKETING_EXAMPLES.map((example) => (
                <button
                  key={example.slug}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPickExample(example)}
                  className="group relative h-28 w-16 shrink-0 overflow-hidden rounded-lg border border-border/60 disabled:pointer-events-none disabled:opacity-60"
                  title={`${example.business} · ${example.category}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/samples/marketing/${example.slug}.jpg`}
                    alt={example.business}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-1 pt-4 text-[9px] font-medium leading-tight text-white">
                    {example.category}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
