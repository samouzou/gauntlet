'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const postJobSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(3).max(120),
  companyName: z.string().min(2).max(100),
  category: z.string().min(2).max(80),
  jobType: z.enum(['full_time', 'part_time', 'contract', 'freelance', 'internship', 'other']),
  location: z.string().min(2).max(120).default('Worldwide'),
  salary: z.string().max(80).optional().nullable(),
  description: z.string().min(40).max(20000),
  applyUrl: z.string().url(),
  tags: z.array(z.string().max(40)).max(12).optional().default([]),
  companyLogo: z.string().url().optional().nullable(),
});

export type PostJobInput = z.infer<typeof postJobSchema>;

export async function postJob(input: PostJobInput) {
  const data = postJobSchema.parse(input);

  const userRef = adminDb.collection('users').doc(data.userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new Error('User profile not found.');
  }

  const user = userSnap.data()!;
  const credits = typeof user.credits === 'number' ? user.credits : 0;

  if (credits < 1) {
    throw new Error('You need at least 1 posting credit to publish a job.');
  }

  const jobRef = adminDb.collection('jobs').doc();

  await adminDb.runTransaction(async (tx) => {
    const freshUser = await tx.get(userRef);
    const freshCredits = freshUser.data()?.credits ?? 0;
    if (freshCredits < 1) {
      throw new Error('You need at least 1 posting credit to publish a job.');
    }

    tx.update(userRef, {
      credits: FieldValue.increment(-1),
      role: 'employer',
      companyName: data.companyName,
    });

    tx.set(jobRef, {
      title: data.title,
      companyName: data.companyName,
      companyLogo: data.companyLogo ?? null,
      category: data.category,
      tags: data.tags ?? [],
      jobType: data.jobType,
      location: data.location || 'Worldwide',
      salary: data.salary || null,
      description: data.description,
      applyUrl: data.applyUrl,
      source: 'employer',
      externalId: null,
      postedBy: data.userId,
      status: 'active',
      publishedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  revalidatePath('/');
  revalidatePath('/employer');

  return { jobId: jobRef.id };
}

export async function closeJob(userId: string, jobId: string) {
  const jobRef = adminDb.collection('jobs').doc(jobId);
  const snap = await jobRef.get();
  if (!snap.exists) throw new Error('Job not found.');
  if (snap.data()?.postedBy !== userId) throw new Error('Not authorized.');

  await jobRef.update({
    status: 'closed',
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath('/');
  revalidatePath('/employer');
}
