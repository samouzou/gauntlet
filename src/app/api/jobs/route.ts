import { NextRequest, NextResponse } from 'next/server';
import { fetchRemotiveJobs } from '@/lib/jobs/remotive';
import { adminDb } from '@/firebase/admin';
import type { Job } from '@/lib/types';

export const dynamic = 'force-dynamic';

function matchesFilters(job: Job, q: string, category: string, jobType: string) {
  const query = q.trim().toLowerCase();
  if (category && job.category.toLowerCase() !== category.toLowerCase()) {
    return false;
  }
  if (jobType && job.jobType !== jobType) {
    return false;
  }
  if (!query) return true;
  const haystack = [
    job.title,
    job.companyName,
    job.category,
    job.location,
    ...(job.tags || []),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

async function fetchEmployerJobs(): Promise<Job[]> {
  try {
    const snap = await adminDb
      .collection('jobs')
      .where('status', '==', 'active')
      .where('source', '==', 'employer')
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        companyName: data.companyName,
        companyLogo: data.companyLogo ?? null,
        category: data.category,
        tags: data.tags ?? [],
        jobType: data.jobType,
        location: data.location,
        salary: data.salary ?? null,
        description: data.description,
        applyUrl: data.applyUrl,
        source: 'employer' as const,
        externalId: null,
        postedBy: data.postedBy ?? null,
        status: data.status,
        publishedAt:
          data.publishedAt?.toDate?.()?.toISOString?.() ??
          data.publishedAt ??
          new Date().toISOString(),
        attribution: null,
      };
    });
  } catch (error) {
    console.error('Failed to load employer jobs:', error);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const jobType = searchParams.get('type') || '';

  try {
    const [remotiveJobs, employerJobs] = await Promise.all([
      fetchRemotiveJobs({
        search: q || undefined,
        category: category || undefined,
        limit: 100,
      }),
      fetchEmployerJobs(),
    ]);

    const merged = [...employerJobs, ...remotiveJobs]
      .filter((job) => matchesFilters(job, q, category, jobType))
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

    return NextResponse.json({
      jobs: merged,
      count: merged.length,
      sources: { remotive: remotiveJobs.length, employer: employerJobs.length },
    });
  } catch (error: any) {
    console.error('Jobs API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load jobs' },
      { status: 500 }
    );
  }
}
