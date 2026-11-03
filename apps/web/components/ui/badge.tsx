import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'brand' | 'strong' | 'good' | 'fair' | 'weak';

const TONES: Record<Tone, string> = {
  neutral: 'bg-canvas text-muted border-line',
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  strong: 'bg-strong-bg text-strong border-strong/20',
  good: 'bg-good-bg text-good border-good/20',
  fair: 'bg-fair-bg text-fair border-fair/20',
  weak: 'bg-weak-bg text-weak border-weak/20',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
