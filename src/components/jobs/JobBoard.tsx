'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JobCard } from '@/components/jobs/JobCard';
import type { Job } from '@/lib/types';
import { JOB_CATEGORIES } from '@/lib/jobs/remotive';

export function JobBoard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [jobType, setJobType] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  const loadJobs = useCallback((search: string, cat: string, type: string) => {
    startTransition(async () => {
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('q', search.trim());
        if (cat !== 'all') params.set('category', cat);
        if (type !== 'all') params.set('type', type);
        const res = await fetch(`/api/jobs?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load jobs');
        setJobs(data.jobs || []);
      } catch (err: any) {
        setError(err.message || 'Could not load jobs');
        setJobs([]);
      } finally {
        setLoaded(true);
      }
    });
  }, []);

  useEffect(() => {
    loadJobs('', 'all', 'all');
  }, [loadJobs]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadJobs(q, category, jobType);
  };

  return (
    <section className="w-full max-w-4xl mx-auto">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-center mb-8"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, company, or skill"
            className="pl-9 h-11 bg-card/50"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 bg-card/50">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {JOB_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={jobType} onValueChange={setJobType}>
          <SelectTrigger className="w-full sm:w-[160px] h-11 bg-card/50">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="full_time">Full time</SelectItem>
            <SelectItem value="part_time">Part time</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="freelance">Freelance</SelectItem>
            <SelectItem value="internship">Internship</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" className="h-11 px-6" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {loaded ? `${jobs.length} remote roles` : 'Loading roles…'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => loadJobs(q, category, jobType)}
          disabled={isPending}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {jobs.map((job, index) => (
          <JobCard key={job.id} job={job} index={index} />
        ))}
      </div>

      {loaded && !isPending && jobs.length === 0 && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-display text-foreground mb-1">No roles matched</p>
          <p className="text-sm">Try a broader search or clear filters.</p>
        </div>
      )}
    </section>
  );
}
