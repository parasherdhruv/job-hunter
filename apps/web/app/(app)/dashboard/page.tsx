'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { ApplicationStatus, CandidateProfile, JobMatch } from '@job-hunter/shared';
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '@job-hunter/shared';
import { api, ApiError } from '@/lib/api';
import { formatSalary, formatWorkMode } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ScoreBadge } from '@/components/score-panel';

interface DashboardData {
  matches: JobMatch[];
  profileReady: boolean;
  profile: CandidateProfile | null;
  stats: Record<string, number>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ranked, profile, stats] = await Promise.all([
        api.matches.rankAll(),
        api.candidate.get(),
        api.jobs.stats(),
      ]);
      setData({ matches: ranked.matches, profileReady: ranked.profileReady, profile, stats });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load the dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { matches, profile, stats, profileReady } = data;
  const totalJobs = Object.values(stats).reduce((sum, count) => sum + count, 0);
  const activeApplications = APPLICATION_STATUSES.filter(
    (status) => !['SAVED', 'REJECTED', 'WITHDRAWN'].includes(status),
  ).reduce((sum, status) => sum + (stats[status] ?? 0), 0);
  const topMatches = matches.slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Dashboard</h1>
          <p className="text-sm text-muted">
            {profile?.name ? `Welcome back, ${profile.name}.` : 'Your job-search overview.'}
          </p>
        </div>
        <LinkButton href="/jobs/new">Add a job</LinkButton>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Jobs tracked" value={totalJobs} />
        <Metric label="Active applications" value={activeApplications} />
        <Metric label="Interviews" value={stats.INTERVIEW ?? 0} />
        <Metric label="Offers" value={stats.OFFER ?? 0} />
      </section>

      {!profileReady && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-brand-100 bg-brand-50">
          <div>
            <p className="text-sm font-semibold text-brand-700">Finish your candidate profile</p>
            <p className="text-xs text-muted">
              Match scores need your skills, titles and salary expectations.
            </p>
          </div>
          <LinkButton href="/profile" variant="primary" size="sm">
            Set up profile
          </LinkButton>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Top matches</h2>
            <Link href="/jobs" className="text-xs font-semibold text-brand-600 hover:underline">
              View all jobs
            </Link>
          </div>

          {topMatches.length === 0 ? (
            <EmptyState
              title="No jobs yet"
              description="Add your first job to see an explainable match score against your profile."
              action={<LinkButton href="/jobs/new">Add a job</LinkButton>}
            />
          ) : (
            <ul className="space-y-3">
              {topMatches.map((match) => (
                <li key={match.job.id}>
                  <Link
                    href={`/jobs/${match.job.id}`}
                    className="card flex flex-wrap items-start justify-between gap-3 transition-colors hover:border-brand-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{match.job.title}</p>
                      <p className="text-sm text-muted">{match.job.company}</p>
                      <p className="mt-1 text-xs text-muted">
                        {match.job.location ?? 'Location not specified'} ·{' '}
                        {formatWorkMode(match.job.workMode)} ·{' '}
                        {formatSalary(match.job.minLpa, match.job.maxLpa)}
                      </p>
                    </div>
                    <ScoreBadge score={match.score} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-ink">Pipeline</h2>
            {totalJobs === 0 ? (
              <p className="text-sm text-muted">No applications tracked yet.</p>
            ) : (
              <ul className="space-y-2">
                {APPLICATION_STATUSES.map((status) => (
                  <li key={status} className="flex items-center justify-between text-sm">
                    <StatusDot status={status} />
                    <span className="tabular-nums font-medium text-ink">{stats[status] ?? 0}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {profile && (
            <div className="card">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Profile</h2>
                <Link href="/profile" className="text-xs font-semibold text-brand-600 hover:underline">
                  Edit
                </Link>
              </div>
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${profile.completeness.score}%` }}
                />
              </div>
              <p className="text-xs text-muted">
                {profile.completeness.score}% complete
                {profile.completeness.missing.length > 0 &&
                  ` · missing ${profile.completeness.missing.length} field(s)`}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.skills.slice(0, 6).map((skill) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function StatusDot({ status }: { status: ApplicationStatus }) {
  const tone =
    status === 'OFFER'
      ? 'bg-strong'
      : status === 'REJECTED' || status === 'WITHDRAWN'
        ? 'bg-weak'
        : status === 'SAVED'
          ? 'bg-muted'
          : 'bg-brand-500';
  return (
    <span className="flex items-center gap-2 text-muted">
      <span className={`h-2 w-2 rounded-full ${tone}`} aria-hidden />
      {APPLICATION_STATUS_LABELS[status]}
    </span>
  );
}
