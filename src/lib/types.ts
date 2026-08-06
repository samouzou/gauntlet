export type UserRole = 'seeker' | 'employer';

export interface UserProfile {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: unknown;
  role: UserRole;
  companyName?: string | null;
  companyWebsite?: string | null;
  /** Posting credits for employers. Seekers stay at 0. */
  credits: number;
}

export interface Product {
  name: string;
  stripe_price_id: string;
  credit_amount: number;
  price_usd: number;
  display_tag: string | null;
  description?: string;
}

export type JobSource = 'remotive' | 'employer';
export type JobType = 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship' | 'other';
export type JobStatus = 'active' | 'closed';

export interface Job {
  id: string;
  title: string;
  companyName: string;
  companyLogo?: string | null;
  category: string;
  tags: string[];
  jobType: JobType;
  location: string;
  salary?: string | null;
  description: string;
  applyUrl: string;
  source: JobSource;
  externalId?: string | null;
  postedBy?: string | null;
  status: JobStatus;
  publishedAt: string;
  attribution?: string | null;
}
