'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ApplicationStatus, Job } from '@job-hunter/shared';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  WORK_MODE_LABELS,
} from '@job-hunter/shared';
import { api, ApiError } from '@/lib/api';
import { formatSalary } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { StatusSelect } from '@/components/status-select';

type Tab = 'ALL' | ApplicationStatus;

export default function ApplicationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [page, counts] = await Promise.all([
        api.jobs.list({ pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
        api.jobs.stats(),
      ]);
      setJobs(page.items);
      setStats(counts);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (tab === 'ALL' ? jobs : jobs.filter((job) => job.status === tab)),
    [jobs, tab],
  );

  function onStatusChange(jobId: string, status: ApplicationStatus) {
    setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, status } : job)));
    setStats((current) => {
      const previous = jobs.find((job) => job.id === jobId)?.status;
      const next = { ...current };
      if (previous) next[previous] = Math.max(0, (next[previous] ?? 1) - 1);
      next[status] = (next[status] ?? 0) + 1;
      return next;
    });
  }

  const tabs: Tab[] = ['ALL', ...APPLICATION_STATUSES];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Applications</h1>
          <p className="text-sm text-muted">Track where each opportunity stands.</p>
        </div>
        <LinkButton href="/jobs/new">Add a job</LinkButton>
      </header>

      <nav className="flex flex-wrap gap-1.5" aria-label="Filter by status">
        {tabs.map((option) => {
          const count = option === 'ALL' ? jobs.length : (stats[option] ?? 0);
          const active = tab === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setTab(option)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'border-brand-100 bg-brand-50 text-brand-700'
                  : 'border-line bg-surface text-muted hover:bg-canvas'
              }`}
            >
              {option === 'ALL' ? 'All' : APPLICATION_STATUS_LABELS[option]} ({count})
            </button>
          );
        })}
      </nav>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && <LoadingState label="Loading applications…" />}

      {!loading && !error && visible.length === 0 && (
        <EmptyState
          title={tab === 'ALL' ? 'Nothing tracked yet' : 'No jobs with this status'}
          description={
            tab === 'ALL'
              ? 'Add a job and set its status to start tracking your pipeline.'
              : 'Change a job’s status or pick another filter.'
          }
          action={tab === 'ALL' ? <LinkButton href="/jobs/new">Add a job</LinkButton> : undefined}
        />
      )}

      {!loading && !error && visible.length > 0 && (
        <ul className="space-y-3">
          {visible.map((job) => (
            <li key={job.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Link href={`/jobs/${job.id}`} className="font-semibold text-ink hover:underline">
                  {job.title}
                </Link>
                <p className="text-sm text-muted">{job.company}</p>
                <p className="mt-1 text-xs text-muted">
                  {job.location ?? 'Location not specified'} · {WORK_MODE_LABELS[job.workMode]} ·{' '}
                  {formatSalary(job.minLpa, job.maxLpa)}
                </p>
                {job.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {job.skills.slice(0, 4).map((skill) => (
                      <Badge key={skill}>{skill}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <StatusSelect
                jobId={job.id}
                value={job.status}
                onChange={(status) => onStatusChange(job.id, status)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
