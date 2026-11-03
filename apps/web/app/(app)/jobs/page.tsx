'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ApplicationStatus, Job, JobMatch, WorkMode } from '@job-hunter/shared';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
} from '@job-hunter/shared';
import { api, ApiError, type JobFilters } from '@/lib/api';
import { formatSalary } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ScoreBadge } from '@/components/score-panel';

const PAGE_SIZE = 10;

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<JobFilters>({ page: 1, pageSize: PAGE_SIZE });
  const [searchDraft, setSearchDraft] = useState('');

  const load = useCallback(async (active: JobFilters) => {
    setLoading(true);
    setError('');
    try {
      const [page, ranked] = await Promise.all([api.jobs.list(active), api.matches.rankAll()]);
      setJobs(page.items);
      setTotal(page.total);
      setTotalPages(page.totalPages);
      setScores(
        ranked.matches.reduce<Record<string, number>>((acc, match: JobMatch) => {
          acc[match.job.id] = match.score;
          return acc;
        }, {}),
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  // Debounce the search box so we do not hit the API on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        current.search === searchDraft ? current : { ...current, search: searchDraft, page: 1 },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  function setFilter<K extends keyof JobFilters>(key: K, value: JobFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  }

  const hasFilters = useMemo(
    () =>
      Boolean(
        filters.search ||
          filters.workMode ||
          filters.status ||
          filters.location ||
          filters.company ||
          filters.minLpa != null ||
          filters.maxLpa != null,
      ),
    [filters],
  );

  function clearFilters() {
    setSearchDraft('');
    setFilters({ page: 1, pageSize: PAGE_SIZE });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Jobs</h1>
          <p className="text-sm text-muted">
            {total} {total === 1 ? 'job' : 'jobs'} tracked
            {hasFilters ? ' · filtered' : ''}
          </p>
        </div>
        <LinkButton href="/jobs/new">Add a job</LinkButton>
      </header>

      <section className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Search" htmlFor="search">
          <TextInput
            id="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Title, company or skill"
          />
        </Field>

        <Field label="Work mode" htmlFor="workMode">
          <Select
            id="workMode"
            value={filters.workMode ?? ''}
            onChange={(event) => setFilter('workMode', event.target.value || undefined)}
          >
            <option value="">Any</option>
            {WORK_MODES.map((mode: WorkMode) => (
              <option key={mode} value={mode}>
                {WORK_MODE_LABELS[mode]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            value={filters.status ?? ''}
            onChange={(event) =>
              setFilter('status', (event.target.value || undefined) as ApplicationStatus | undefined)
            }
          >
            <option value="">Any</option>
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {APPLICATION_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Location" htmlFor="location">
          <TextInput
            id="location"
            value={filters.location ?? ''}
            onChange={(event) => setFilter('location', event.target.value || undefined)}
            placeholder="e.g. Bengaluru"
          />
        </Field>

        <Field label="Min salary (LPA)" htmlFor="minLpa">
          <TextInput
            id="minLpa"
            type="number"
            min={0}
            value={filters.minLpa ?? ''}
            onChange={(event) =>
              setFilter('minLpa', event.target.value === '' ? undefined : Number(event.target.value))
            }
          />
        </Field>

        <Field label="Max salary (LPA)" htmlFor="maxLpa">
          <TextInput
            id="maxLpa"
            type="number"
            min={0}
            value={filters.maxLpa ?? ''}
            onChange={(event) =>
              setFilter('maxLpa', event.target.value === '' ? undefined : Number(event.target.value))
            }
          />
        </Field>

        <Field label="Sort by" htmlFor="sortBy">
          <Select
            id="sortBy"
            value={filters.sortBy ?? 'createdAt'}
            onChange={(event) => setFilter('sortBy', event.target.value)}
          >
            <option value="createdAt">Newest</option>
            <option value="title">Title</option>
            <option value="company">Company</option>
            <option value="salary">Salary</option>
          </Select>
        </Field>

        <div className="flex items-end">
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted hover:bg-canvas hover:text-ink disabled:opacity-50"
          >
            Clear filters
          </button>
        </div>
      </section>

      {error && <ErrorState message={error} onRetry={() => void load(filters)} />}
      {loading && <LoadingState label="Loading jobs…" />}

      {!loading && !error && jobs.length === 0 && (
        <EmptyState
          title={hasFilters ? 'No jobs match those filters' : 'No jobs yet'}
          description={
            hasFilters
              ? 'Try widening your filters or clearing the search.'
              : 'Add your first opportunity to start tracking and scoring it.'
          }
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:bg-canvas"
              >
                Clear filters
              </button>
            ) : (
              <LinkButton href="/jobs/new">Add a job</LinkButton>
            )
          }
        />
      )}

      {!loading && !error && jobs.length > 0 && (
        <>
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="card flex flex-wrap items-start justify-between gap-4 transition-colors hover:border-brand-100"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{job.title}</p>
                      <Badge>{APPLICATION_STATUS_LABELS[job.status]}</Badge>
                    </div>
                    <p className="text-sm text-muted">{job.company}</p>
                    <p className="mt-1 text-xs text-muted">
                      {job.location ?? 'Location not specified'} · {WORK_MODE_LABELS[job.workMode]} ·{' '}
                      {formatSalary(job.minLpa, job.maxLpa)}
                    </p>
                    {job.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.skills.slice(0, 5).map((skill) => (
                          <Badge key={skill}>{skill}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {scores[job.id] != null && <ScoreBadge score={scores[job.id]} />}
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
              <button
                type="button"
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => setFilters((c) => ({ ...c, page: (c.page ?? 1) - 1 }))}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-canvas disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-muted">
                Page {filters.page ?? 1} of {totalPages}
              </span>
              <button
                type="button"
                disabled={(filters.page ?? 1) >= totalPages}
                onClick={() => setFilters((c) => ({ ...c, page: (c.page ?? 1) + 1 }))}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-canvas disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
