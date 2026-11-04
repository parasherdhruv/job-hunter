'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Job, MatchResult } from '@job-hunter/shared';
import { APPLICATION_STATUS_LABELS, WORK_MODE_LABELS } from '@job-hunter/shared';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatSalary } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { ScorePanel } from '@/components/score-panel';
import { StatusSelect } from '@/components/status-select';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params.id;

  const [job, setJob] = useState<Job | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedJob, loadedMatch] = await Promise.all([
        api.jobs.get(jobId),
        api.jobs.match(jobId).catch(() => null),
      ]);
      setJob(loadedJob);
      setMatch(loadedMatch);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load this job.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete() {
    if (!window.confirm('Delete this job? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.jobs.remove(jobId);
      router.push('/jobs');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not delete this job.');
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState label="Loading job…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!job) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/jobs" className="text-xs font-semibold text-brand-600 hover:underline">
          ← Back to jobs
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{job.title}</h1>
          <p className="text-sm text-muted">{job.company}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge>{APPLICATION_STATUS_LABELS[job.status]}</Badge>
            <span>{job.location ?? 'Location not specified'}</span>
            <span>· {WORK_MODE_LABELS[job.workMode]}</span>
            <span>· {formatSalary(job.minLpa, job.maxLpa)}</span>
            <span>· Added {formatDate(job.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="danger" size="sm" onClick={() => void onDelete()} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas"
          >
            Open source ↗
          </a>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold text-ink">Application status</h2>
            <StatusSelect jobId={job.id} value={job.status} onChange={(status) => setJob((c) => (c ? { ...c, status } : c))} />
          </section>

          <section className="card">
            <h2 className="mb-3 text-sm font-semibold text-ink">Required skills</h2>
            {job.skills.length === 0 ? (
              <p className="text-sm text-muted">No skills were listed for this job.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="mb-3 text-sm font-semibold text-ink">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {job.description}
            </p>
          </section>
        </div>

        <div>
          {match ? (
            <ScorePanel
              score={match.score}
              breakdown={match.breakdown}
              reasons={match.reasons}
              matchedSkills={match.matchedSkills}
              missingSkills={match.missingSkills}
              notes={match.notes}
            />
          ) : (
            <div className="card">
              <h2 className="mb-2 text-sm font-semibold text-ink">Match score</h2>
              <p className="text-sm text-muted">
                Add a candidate profile to see how well this job fits.
              </p>
              <LinkButton href="/profile" size="sm" className="mt-3">
                Set up profile
              </LinkButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
