import type { ApplicationStatus, WorkMode } from '@job-hunter/shared';
import { APPLICATION_STATUS_LABELS, WORK_MODE_LABELS } from '@job-hunter/shared';

export function formatSalary(min: number | null, max: number | null): string {
  if (min == null && max == null) return 'Not disclosed';
  if (min != null && max != null) return `₹${min}–${max} LPA`;
  if (min != null) return `From ₹${min} LPA`;
  return `Up to ₹${max} LPA`;
}

export function formatStatus(status: ApplicationStatus): string {
  return APPLICATION_STATUS_LABELS[status];
}

export function formatWorkMode(mode: WorkMode): string {
  return WORK_MODE_LABELS[mode];
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Colour token for a match score, from strong (green) to weak (red). */
export function scoreTone(score: number): 'strong' | 'good' | 'fair' | 'weak' {
  if (score >= 85) return 'strong';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'weak';
}
