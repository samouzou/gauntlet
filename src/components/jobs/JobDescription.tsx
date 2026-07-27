import { toJobDescriptionHtml } from '@/lib/jobs/sanitize-html';
import type { Job } from '@/lib/types';

interface JobDescriptionProps {
  description: string;
  source: Job['source'];
}

export function JobDescription({ description, source }: JobDescriptionProps) {
  const html = toJobDescriptionHtml(description, source);

  if (!html) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border border-border/60 bg-card/30 p-6">
        No description provided.
      </p>
    );
  }

  return (
    <div
      className="job-prose rounded-xl border border-border/60 bg-card/30 p-6 sm:p-8"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
