import type { ReactNode } from 'react';

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand-600 ${className}`}
    />
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-muted">
      <Spinner />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-weak/20 bg-weak-bg px-4 py-3 text-sm text-weak"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-weak/30 px-3 py-1 text-xs font-semibold hover:bg-weak/10"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-md text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}
