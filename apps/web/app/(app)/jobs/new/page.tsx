'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WORK_MODES, WORK_MODE_LABELS } from '@job-hunter/shared';
import { api, ApiError } from '@/lib/api';
import { Button, LinkButton } from '@/components/ui/button';
import { Field, Select, TextArea, TextInput } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';

interface FormState {
  title: string;
  company: string;
  location: string;
  workMode: string;
  description: string;
  skills: string;
  minLpa: string;
  maxLpa: string;
  sourceUrl: string;
}

const EMPTY: FormState = {
  title: '',
  company: '',
  location: '',
  workMode: 'UNKNOWN',
  description: '',
  skills: '',
  minLpa: '',
  maxLpa: '',
  sourceUrl: '',
};

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        company: form.company.trim(),
        description: form.description.trim(),
        workMode: form.workMode,
        sourceUrl: form.sourceUrl.trim(),
        skills: form.skills
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      };
      if (form.location.trim()) payload.location = form.location.trim();
      if (form.minLpa !== '') payload.minLpa = Number(form.minLpa);
      if (form.maxLpa !== '') payload.maxLpa = Number(form.maxLpa);

      const created = await api.jobs.create(payload);
      router.push(`/jobs/${created.id}`);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not save this job. Please try again.',
      );
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Add a job</h1>
        <p className="text-sm text-muted">
          Record an opportunity you found. We score it against your profile automatically.
        </p>
      </header>

      {error && <ErrorState message={error} />}

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card grid gap-4 sm:grid-cols-2">
            <Field label="Job title" htmlFor="title">
              <TextInput
                id="title"
                required
                maxLength={200}
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="Senior React Developer"
              />
            </Field>
            <Field label="Company" htmlFor="company">
              <TextInput
                id="company"
                required
                maxLength={200}
                value={form.company}
                onChange={(event) => update('company', event.target.value)}
                placeholder="Acme Inc."
              />
            </Field>
            <Field label="Location" htmlFor="location">
              <TextInput
                id="location"
                value={form.location}
                onChange={(event) => update('location', event.target.value)}
                placeholder="Bengaluru, India"
              />
            </Field>
            <Field label="Work mode" htmlFor="workMode">
              <Select
                id="workMode"
                value={form.workMode}
                onChange={(event) => update('workMode', event.target.value)}
              >
                {WORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {WORK_MODE_LABELS[mode]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="card grid gap-4">
            <Field
              label="Required skills"
              hint="One per line. Used for the technical-skills match."
              htmlFor="skills"
            >
              <TextArea
                id="skills"
                value={form.skills}
                onChange={(event) => update('skills', event.target.value)}
                placeholder={'React\nTypeScript\nNode.js'}
              />
            </Field>
            <Field label="Job description" htmlFor="description">
              <TextArea
                id="description"
                required
                maxLength={20000}
                className="min-h-40"
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="Paste the role description here."
              />
            </Field>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card grid gap-4">
            <Field label="Minimum salary (LPA)" htmlFor="minLpa">
              <TextInput
                id="minLpa"
                type="number"
                min={0}
                value={form.minLpa}
                onChange={(event) => update('minLpa', event.target.value)}
                placeholder="18"
              />
            </Field>
            <Field label="Maximum salary (LPA)" htmlFor="maxLpa">
              <TextInput
                id="maxLpa"
                type="number"
                min={0}
                value={form.maxLpa}
                onChange={(event) => update('maxLpa', event.target.value)}
                placeholder="25"
              />
            </Field>
          </div>

          <div className="card grid gap-4">
            <Field
              label="Source URL"
              hint="Required and unique. Duplicate URLs are rejected."
              htmlFor="sourceUrl"
            >
              <TextInput
                id="sourceUrl"
                type="url"
                required
                value={form.sourceUrl}
                onChange={(event) => update('sourceUrl', event.target.value)}
                placeholder="https://example.com/jobs/123"
              />
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save job'}
            </Button>
            <LinkButton href="/jobs" variant="secondary">
              Cancel
            </LinkButton>
          </div>
        </div>
      </form>
    </div>
  );
}
