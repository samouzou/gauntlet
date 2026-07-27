'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, ExternalLink, MapPin, Building2 } from 'lucide-react';
import type { Job } from '@/lib/types';
import { JobDescription } from '@/components/jobs/JobDescription';

export function JobDetail() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = decodeURIComponent(params.id);
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load job');
        const found = (data.jobs as Job[]).find((j) => j.id === id) || null;
        if (!cancelled) {
          if (!found) setError('This role is no longer available.');
          setJob(found);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load job');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24">
        <p className="text-lg font-display mb-2">{error || 'Job not found'}</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to jobs
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto animate-fade-up">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          All jobs
        </Link>
      </Button>

      <div className="flex items-start gap-4 mb-6">
        <div className="h-14 w-14 shrink-0 rounded-xl border border-border/60 bg-secondary/60 flex items-center justify-center overflow-hidden">
          {job.companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.companyLogo} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {job.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">{job.companyName}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <Badge variant="secondary">{job.category}</Badge>
        <Badge variant="outline" className="capitalize">
          {job.jobType.replace('_', ' ')}
        </Badge>
        <Badge variant="outline" className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {job.location}
        </Badge>
        {job.salary ? <Badge variant="outline">{job.salary}</Badge> : null}
        {job.source === 'employer' ? (
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0">
            Posted on Outpost
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 mb-10">
        <Button asChild size="lg">
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
            Apply now
            <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        {job.attribution ? (
          <p className="text-xs text-muted-foreground self-center">
            Listing sourced from {job.attribution}. Apply on the original posting.
          </p>
        ) : null}
      </div>

      <JobDescription description={job.description} source={job.source} />
    </article>
  );
}
