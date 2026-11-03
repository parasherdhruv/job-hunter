/**
 * Shared API contract types used by both the NestJS API and the Next.js web app.
 * These are compile-time only (no runtime dependencies) and are erased at build
 * time, so the package needs no build step.
 */

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE', 'UNKNOWN'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const JOB_SOURCES = ['MANUAL', 'COMPANY_SITE', 'API', 'RSS', 'OTHER'] as const;
export type JobSource = (typeof JOB_SOURCES)[number];

export const APPLICATION_STATUSES = [
  'SAVED',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  ONSITE: 'Onsite',
  HYBRID: 'Hybrid',
  REMOTE: 'Remote',
  UNKNOWN: 'Not specified',
};

/* -------------------------------------------------------------------------- */
/* API envelope                                                               */
/* -------------------------------------------------------------------------- */

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorBody | null;
  meta?: Record<string, unknown>;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/* -------------------------------------------------------------------------- */
/* Entities                                                                   */
/* -------------------------------------------------------------------------- */

export interface CandidateProfile {
  id: string;
  name: string | null;
  headline: string | null;
  yearsExperience: number;
  skills: string[];
  preferredTitles: string[];
  preferredLocations: string[];
  remoteOpen: boolean;
  targetMinLpa: number | null;
  targetMaxLpa: number | null;
  resumeFileName: string | null;
  resumeText: string | null;
  completeness: ProfileCompleteness;
  updatedAt: string;
  createdAt: string;
}

export interface ProfileCompleteness {
  score: number;
  missing: string[];
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workMode: WorkMode;
  description: string;
  skills: string[];
  minLpa: number | null;
  maxLpa: number | null;
  source: JobSource;
  sourceUrl: string;
  externalId: string | null;
  postedAt: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Matching                                                                   */
/* -------------------------------------------------------------------------- */

export interface ScoreBreakdown {
  skills: number;
  title: number;
  location: number;
  salary: number;
  experience: number;
}

export interface ScoreReason {
  factor: keyof ScoreBreakdown;
  label: string;
  score: number;
  max: number;
  explanation: string;
}

export interface MatchResult {
  score: number;
  breakdown: ScoreBreakdown;
  reasons: ScoreReason[];
  matchedSkills: string[];
  missingSkills: string[];
  notes: string[];
}

export interface JobMatch extends MatchResult {
  job: Job;
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export interface AuthUser {
  username: string;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}
