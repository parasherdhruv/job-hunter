'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CandidateProfile } from '@job-hunter/shared';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Field, TextArea, TextInput } from '@/components/ui/field';
import { ErrorState, LoadingState } from '@/components/ui/states';

interface FormState {
  name: string;
  headline: string;
  yearsExperience: string;
  skills: string;
  preferredTitles: string;
  preferredLocations: string;
  targetMinLpa: string;
  targetMaxLpa: string;
  remoteOpen: boolean;
}

const EMPTY: FormState = {
  name: '',
  headline: '',
  yearsExperience: '',
  skills: '',
  preferredTitles: '',
  preferredLocations: '',
  targetMinLpa: '',
  targetMaxLpa: '',
  remoteOpen: true,
};

const toLines = (value: string[]): string => value.join('\n');
const fromLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export default function ProfilePage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resumeError, setResumeError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const existing = await api.candidate.get();
      setProfile(existing);
      setForm(
        existing
          ? {
              name: existing.name ?? '',
              headline: existing.headline ?? '',
              yearsExperience: String(existing.yearsExperience ?? ''),
              skills: toLines(existing.skills),
              preferredTitles: toLines(existing.preferredTitles),
              preferredLocations: toLines(existing.preferredLocations),
              targetMinLpa: existing.targetMinLpa != null ? String(existing.targetMinLpa) : '',
              targetMaxLpa: existing.targetMaxLpa != null ? String(existing.targetMaxLpa) : '',
              remoteOpen: existing.remoteOpen,
            }
          : EMPTY,
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        headline: form.headline.trim(),
        yearsExperience: form.yearsExperience === '' ? 0 : Number(form.yearsExperience),
        skills: fromLines(form.skills),
        preferredTitles: fromLines(form.preferredTitles),
        preferredLocations: fromLines(form.preferredLocations),
        remoteOpen: form.remoteOpen,
      };
      if (form.targetMinLpa !== '') payload.targetMinLpa = Number(form.targetMinLpa);
      if (form.targetMaxLpa !== '') payload.targetMaxLpa = Number(form.targetMaxLpa);

      const saved = await api.candidate.save(payload);
      setProfile(saved);
      setNotice('Profile saved. Match scores now use these details.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function onResumeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setResumeError('');
    setNotice('');
    try {
      const updated = await api.candidate.uploadResume(file);
      setProfile(updated);
      setNotice(`Resume "${updated.resumeFileName}" uploaded.`);
    } catch (caught) {
      setResumeError(caught instanceof ApiError ? caught.message : 'Resume upload failed.');
    } finally {
      event.target.value = '';
    }
  }

  async function removeResume() {
    setResumeError('');
    try {
      const updated = await api.candidate.removeResume();
      setProfile(updated);
      setNotice('Resume removed.');
    } catch (caught) {
      setResumeError(caught instanceof ApiError ? caught.message : 'Could not remove the resume.');
    }
  }

  if (loading) return <LoadingState label="Loading your profile…" />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Candidate profile</h1>
          <p className="text-sm text-muted">
            These details drive the matching engine. The more complete, the better the scores.
          </p>
        </div>
        {profile && (
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums text-ink">
              {profile.completeness.score}%
            </p>
            <p className="text-xs text-muted">profile complete</p>
          </div>
        )}
      </header>

      {profile && profile.completeness.missing.length > 0 && (
        <div className="card border-fair/20 bg-fair-bg">
          <p className="text-xs font-semibold text-fair">Still missing</p>
          <p className="mt-1 text-xs text-muted">{profile.completeness.missing.join(' · ')}</p>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} />}
      {notice && (
        <div className="rounded-lg border border-strong/20 bg-strong-bg px-4 py-3 text-sm text-strong">
          {notice}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name">
              <TextInput
                id="name"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                placeholder="Your name"
              />
            </Field>

            <Field label="Professional headline" htmlFor="headline">
              <TextInput
                id="headline"
                value={form.headline}
                onChange={(event) => update('headline', event.target.value)}
                placeholder="Senior Full Stack Engineer"
              />
            </Field>

            <Field label="Years of experience" htmlFor="years">
              <TextInput
                id="years"
                type="number"
                min={0}
                max={60}
                step={0.5}
                value={form.yearsExperience}
                onChange={(event) => update('yearsExperience', event.target.value)}
                placeholder="4"
              />
            </Field>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.remoteOpen}
                  onChange={(event) => update('remoteOpen', event.target.checked)}
                  className="h-4 w-4 rounded border-line"
                />
                Open to remote work
              </label>
            </div>
          </div>

          <div className="card grid gap-4">
            <Field
              label="Technical skills"
              hint="One per line. Aliases such as React.js and Node.js are normalized automatically."
              htmlFor="skills"
            >
              <TextArea
                id="skills"
                value={form.skills}
                onChange={(event) => update('skills', event.target.value)}
                placeholder={'React\nTypeScript\nNode.js\nPostgreSQL'}
              />
            </Field>

            <Field label="Preferred job titles" hint="One per line." htmlFor="titles">
              <TextArea
                id="titles"
                value={form.preferredTitles}
                onChange={(event) => update('preferredTitles', event.target.value)}
                placeholder={'Senior React Developer\nSenior Full Stack Engineer'}
              />
            </Field>

            <Field label="Preferred locations" hint="One per line." htmlFor="locations">
              <TextArea
                id="locations"
                value={form.preferredLocations}
                onChange={(event) => update('preferredLocations', event.target.value)}
                placeholder={'Bengaluru\nPune\nRemote'}
              />
            </Field>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card grid gap-4">
            <h2 className="text-sm font-semibold text-ink">Salary expectations (LPA)</h2>
            <Field label="Minimum" htmlFor="minLpa">
              <TextInput
                id="minLpa"
                type="number"
                min={0}
                value={form.targetMinLpa}
                onChange={(event) => update('targetMinLpa', event.target.value)}
                placeholder="18"
              />
            </Field>
            <Field label="Maximum" htmlFor="maxLpa">
              <TextInput
                id="maxLpa"
                type="number"
                min={0}
                value={form.targetMaxLpa}
                onChange={(event) => update('targetMaxLpa', event.target.value)}
                placeholder="25"
              />
            </Field>
          </div>

          <div className="card grid gap-3">
            <h2 className="text-sm font-semibold text-ink">Resume</h2>
            <p className="text-xs text-muted">
              {profile?.resumeFileName
                ? `Current file: ${profile.resumeFileName}`
                : 'PDF, DOC or DOCX up to 5 MB. Text is extracted for matching.'}
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              onChange={onResumeChange}
              className="text-xs"
            />
            {profile?.resumeFileName && (
              <Button type="button" variant="secondary" size="sm" onClick={() => void removeResume()}>
                Remove resume
              </Button>
            )}
            {resumeError && <p className="text-xs text-weak">{resumeError}</p>}
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
