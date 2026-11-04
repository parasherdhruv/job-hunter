import type { ScoreBreakdown, ScoreReason } from '@job-hunter/shared';
import { Badge } from '@/components/ui/badge';
import { scoreTone } from '@/lib/format';

const TONE_CLASS = {
  strong: 'text-strong',
  good: 'text-good',
  fair: 'text-fair',
  weak: 'text-weak',
} as const;

const BAR_CLASS = {
  strong: 'bg-strong',
  good: 'bg-good',
  fair: 'bg-fair',
  weak: 'bg-weak',
} as const;

/** Compact score indicator used in lists. */
export function ScoreBadge({ score }: { score: number }) {
  return <Badge tone={scoreTone(score)}>{score}/100</Badge>;
}

/** Full, explainable score panel used on the job detail screen. */
export function ScorePanel({
  score,
  reasons,
  matchedSkills,
  missingSkills,
  notes,
}: {
  score: number;
  breakdown: ScoreBreakdown;
  reasons: ScoreReason[];
  matchedSkills: string[];
  missingSkills: string[];
  notes: string[];
}) {
  const tone = scoreTone(score);
  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Match score</h2>
          <p className="text-xs text-muted">Deterministic, rules-based and explainable.</p>
        </div>
        <div className={`text-3xl font-bold tabular-nums ${TONE_CLASS[tone]}`}>
          {score}
          <span className="text-sm font-medium text-muted">/100</span>
        </div>
      </div>

      <ul className="space-y-3">
        {reasons.map((reason) => {
          const percent = Math.round((reason.score / reason.max) * 100);
          const factorTone = scoreTone(percent);
          return (
            <li key={reason.factor}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{reason.label}</span>
                <span className="tabular-nums text-muted">
                  {reason.score}/{reason.max}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                <div
                  className={`h-full rounded-full ${BAR_CLASS[factorTone]}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">{reason.explanation}</p>
            </li>
          );
        })}
      </ul>

      {(matchedSkills.length > 0 || missingSkills.length > 0) && (
        <div className="space-y-3 border-t border-line pt-4">
          {matchedSkills.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink">Matched skills</p>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map((skill) => (
                  <Badge key={skill} tone="strong">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {missingSkills.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink">Missing skills</p>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((skill) => (
                  <Badge key={skill} tone="weak">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {notes.length > 0 && (
        <ul className="space-y-1 border-t border-line pt-4 text-xs text-muted">
          {notes.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
