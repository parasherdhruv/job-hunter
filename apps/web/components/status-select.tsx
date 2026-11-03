'use client';

import { useState } from 'react';
import type { ApplicationStatus } from '@job-hunter/shared';
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '@job-hunter/shared';
import { api, ApiError } from '@/lib/api';
import { Select } from '@/components/ui/field';

/**
 * Inline status control. Updates optimistically and rolls back if the API
 * rejects the change, so the UI never shows a status the server did not accept.
 */
export function StatusSelect({
  jobId,
  value,
  onChange,
}: {
  jobId: string;
  value: ApplicationStatus;
  onChange?: (status: ApplicationStatus) => void;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function change(next: ApplicationStatus) {
    const previous = status;
    setStatus(next);
    setBusy(true);
    setError('');
    try {
      const updated = await api.jobs.updateStatus(jobId, next);
      setStatus(updated.status);
      onChange?.(updated.status);
    } catch (caught) {
      setStatus(previous);
      setError(caught instanceof ApiError ? caught.message : 'Could not update status.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Select
        aria-label="Application status"
        value={status}
        disabled={busy}
        onChange={(event) => void change(event.target.value as ApplicationStatus)}
        className="w-full sm:w-40"
      >
        {APPLICATION_STATUSES.map((option) => (
          <option key={option} value={option}>
            {APPLICATION_STATUS_LABELS[option]}
          </option>
        ))}
      </Select>
      {error && <span className="text-xs text-weak">{error}</span>}
    </div>
  );
}
