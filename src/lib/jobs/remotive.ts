import type { Job, JobType } from '@/lib/types';
import { sanitizeJobHtml } from '@/lib/jobs/sanitize-html';

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  company_logo_url?: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
  'job-count'?: number;
}

function mapJobType(raw: string): JobType {
  const value = (raw || '').toLowerCase();
  if (value.includes('part')) return 'part_time';
  if (value.includes('contract')) return 'contract';
  if (value.includes('freelance')) return 'freelance';
  if (value.includes('intern')) return 'internship';
  if (value.includes('full')) return 'full_time';
  return 'other';
}

export function mapRemotiveJob(job: RemotiveJob): Job {
  return {
    id: `remotive-${job.id}`,
    title: job.title,
    companyName: job.company_name,
    companyLogo: job.company_logo_url || job.company_logo || null,
    category: job.category || 'General',
    tags: job.tags || [],
    jobType: mapJobType(job.job_type),
    location: job.candidate_required_location || 'Worldwide',
    salary: job.salary || null,
    description: sanitizeJobHtml(job.description || ''),
    applyUrl: job.url,
    source: 'remotive',
    externalId: String(job.id),
    postedBy: null,
    status: 'active',
    publishedAt: job.publication_date,
    attribution: 'Remotive',
  };
}

export async function fetchRemotiveJobs(options?: {
  search?: string;
  category?: string;
  limit?: number;
}): Promise<Job[]> {
  const params = new URLSearchParams();
  if (options?.search) params.set('search', options.search);
  if (options?.category) params.set('category', options.category);
  if (options?.limit) params.set('limit', String(options.limit));

  const query = params.toString();
  const url = `https://remotive.com/api/remote-jobs${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    next: { revalidate: 60 * 30 },
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Remotive API error: ${response.status}`);
  }

  const data = (await response.json()) as RemotiveResponse;
  return (data.jobs || []).map(mapRemotiveJob);
}

export const JOB_CATEGORIES = [
  'Software Development',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Customer Support',
  'DevOps / Sysadmin',
  'Data',
  'Finance',
  'Human Resources',
  'Writing',
  'All others',
] as const;
