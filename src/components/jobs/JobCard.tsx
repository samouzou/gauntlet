'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, ArrowUpRight } from 'lucide-react';
import type { Job } from '@/lib/types';
import { cn } from '@/lib/utils';

function formatJobType(type: Job['jobType']) {
  return type.replace('_', ' ');
}

export function JobCard({ job, index = 0 }: { job: Job; index?: number }) {
  const published = (() => {
    try {
      return formatDistanceToNow(new Date(job.publishedAt), { addSuffix: true });
    } catch {
      return '';
    }
  })();

  return (
    <Link
      href={`/jobs/${encodeURIComponent(job.id)}`}
      className={cn(
        'group block rounded-xl border border-border/70 bg-card/40 p-5 transition-all duration-300',
        'hover:border-primary/40 hover:bg-card/70 hover:-translate-y-0.5',
        'animate-fade-up'
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-lg border border-border/60 bg-secondary/60 flex items-center justify-center overflow-hidden">
          {job.companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.companyLogo} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                {job.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {job.companyName}
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
            <span className="capitalize">{formatJobType(job.jobType)}</span>
            {job.salary ? <span>{job.salary}</span> : null}
            {published ? <span>{published}</span> : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="font-normal">
              {job.category}
            </Badge>
            {job.source === 'employer' ? (
              <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0">
                Posted on Outpost
              </Badge>
            ) : job.attribution ? (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                via {job.attribution}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
