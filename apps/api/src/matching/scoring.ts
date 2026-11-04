/**
 * Explainable job-matching engine.
 *
 * The score is deterministic: identical inputs always produce identical output.
 * Every factor returns a bounded number of points plus a human-readable reason,
 * so the UI can show *why* a job scored the way it did.
 *
 * Weights (total 100):
 *   skills     40
 *   title      20
 *   location   15
 *   salary     15
 *   experience 10
 */

export const SCORE_WEIGHTS = {
  skills: 40,
  title: 20,
  location: 15,
  salary: 15,
  experience: 10,
} as const;

export type ScoreFactor = keyof typeof SCORE_WEIGHTS;

export interface ScoreReason {
  factor: ScoreFactor;
  label: string;
  score: number;
  max: number;
  explanation: string;
}

export interface ScoreBreakdown {
  skills: number;
  title: number;
  location: number;
  salary: number;
  experience: number;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  reasons: ScoreReason[];
  matchedSkills: string[];
  missingSkills: string[];
  notes: string[];
}

/** Minimal shapes so the engine is independent of Prisma types. */
export interface CandidateInput {
  yearsExperience: number;
  skills: string[];
  preferredTitles: string[];
  preferredLocations: string[];
  remoteOpen: boolean;
  targetMinLpa: number | null;
  targetMaxLpa: number | null;
}

export interface JobInput {
  title: string;
  location: string | null;
  workMode: string;
  skills: string[];
  minLpa: number | null;
  maxLpa: number | null;
}

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

/** Common aliases so "React.js" and "React" are treated as the same skill. */
const SKILL_ALIASES: Record<string, string> = {
  'react.js': 'react',
  reactjs: 'react',
  'node.js': 'node',
  nodejs: 'node',
  'next.js': 'next',
  nextjs: 'next',
  'vue.js': 'vue',
  vuejs: 'vue',
  'express.js': 'express',
  expressjs: 'express',
  'nest.js': 'nest',
  nestjs: 'nest',
  'angular.js': 'angular',
  angularjs: 'angular',
  'tailwindcss': 'tailwind',
  'tailwind css': 'tailwind',
  'postgres': 'postgresql',
  'postgres.js': 'postgresql',
  'mongo': 'mongodb',
  'js': 'javascript',
  'ts': 'typescript',
  'golang': 'go',
};

function canonicalizeSkill(value: string): string {
  const normalized = normalize(value);
  return SKILL_ALIASES[normalized] ?? normalized;
}

function uniqueCanonical(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const canonical = canonicalizeSkill(value);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    result.push(canonical);
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* Individual factors                                                         */
/* -------------------------------------------------------------------------- */

function scoreSkills(candidate: CandidateInput, job: JobInput) {
  const candidateSkills = uniqueCanonical(candidate.skills);
  // Keep the job's original spelling for display while comparing canonically.
  const jobSkills = uniqueCanonical(job.skills);
  const displayName = new Map<string, string>();
  for (const raw of job.skills) {
    const canonical = canonicalizeSkill(raw);
    if (canonical && !displayName.has(canonical)) displayName.set(canonical, raw.trim());
  }
  const label = (canonical: string): string => displayName.get(canonical) ?? canonical;

  const matched = jobSkills
    .filter((skill) => candidateSkills.includes(skill))
    .map(label);
  const missing = jobSkills
    .filter((skill) => !candidateSkills.includes(skill))
    .map(label);

  const max = SCORE_WEIGHTS.skills;
  if (jobSkills.length === 0) {
    // Neutral, conservative score when the job lists no required skills.
    const score = Math.round(max * 0.5);
    return {
      score,
      matched,
      missing,
      explanation: 'This job lists no required skills, so a neutral skills score was applied.',
    };
  }

  const score = Math.round((matched.length / jobSkills.length) * max);
  const explanation =
    matched.length === 0
      ? `None of the ${jobSkills.length} required skills appear in your profile.`
      : `You match ${matched.length} of ${jobSkills.length} required skills (${matched.join(', ')}).`;

  return { score, matched, missing, explanation };
}

function scoreTitle(candidate: CandidateInput, job: JobInput) {
  const max = SCORE_WEIGHTS.title;
  const title = normalize(job.title);
  const preferred = candidate.preferredTitles.map(normalize).filter(Boolean);

  if (preferred.length === 0) {
    return {
      score: Math.round(max * 0.5),
      explanation: 'Add preferred job titles to your profile to sharpen title relevance.',
    };
  }

  // Exact-ish containment match against a preferred title scores full marks.
  const directMatch = preferred.find((p) => title.includes(p) || p.includes(title));
  if (directMatch) {
    return { score: max, explanation: `The title closely matches your preference "${directMatch}".` };
  }

  // Otherwise score by shared significant keywords.
  const stopWords = new Set(['senior', 'junior', 'lead', 'staff', 'principal', 'the', 'and', 'of', 'a']);
  const tokens = (value: string) =>
    new Set(value.split(/[^a-z0-9+#.]+/).filter((t) => t.length > 2 && !stopWords.has(t)));

  const jobTokens = tokens(title);
  const preferredTokens = new Set(preferred.flatMap((p) => [...tokens(p)]));
  const overlap = [...jobTokens].filter((t) => preferredTokens.has(t));

  if (overlap.length > 0) {
    const ratio = overlap.length / Math.max(jobTokens.size, 1);
    const score = Math.round(max * Math.min(1, 0.4 + ratio * 0.6));
    return {
      score,
      explanation: `The title shares keywords (${overlap.join(', ')}) with your preferred roles.`,
    };
  }

  return {
    score: Math.round(max * 0.25),
    explanation: 'The title does not clearly match your preferred roles.',
  };
}

function scoreLocation(candidate: CandidateInput, job: JobInput) {
  const max = SCORE_WEIGHTS.location;
  const mode = job.workMode;
  const jobLocation = normalize(job.location ?? '');
  const preferred = candidate.preferredLocations.map(normalize).filter(Boolean);

  if (mode === 'REMOTE' && candidate.remoteOpen) {
    return { score: max, explanation: 'This role is remote and you are open to remote work.' };
  }

  const locationMatches =
    jobLocation.length > 0 &&
    preferred.some((p) => jobLocation.includes(p) || p.includes(jobLocation));

  if (locationMatches) {
    return { score: max, explanation: `The location matches your preference (${job.location}).` };
  }

  if (mode === 'HYBRID' && candidate.remoteOpen) {
    return {
      score: Math.round(max * 0.7),
      explanation: 'This hybrid role is partially remote, which fits your flexibility.',
    };
  }

  if (preferred.length === 0) {
    return {
      score: Math.round(max * 0.5),
      explanation: 'Add preferred locations to your profile to improve location scoring.',
    };
  }

  if (!jobLocation) {
    return { score: Math.round(max * 0.4), explanation: 'The job does not state a location.' };
  }

  return {
    score: Math.round(max * 0.25),
    explanation: `The location (${job.location}) is outside your preferred locations.`,
  };
}

function scoreSalary(candidate: CandidateInput, job: JobInput) {
  const max = SCORE_WEIGHTS.salary;
  const { targetMinLpa, targetMaxLpa } = candidate;

  if (targetMinLpa == null && targetMaxLpa == null) {
    return {
      score: Math.round(max * 0.5),
      explanation: 'Add your salary expectations to score compensation fit.',
    };
  }
  if (job.minLpa == null && job.maxLpa == null) {
    return {
      score: Math.round(max * 0.5),
      explanation: 'This job does not publish a salary range.',
    };
  }

  const jobMax = job.maxLpa ?? job.minLpa ?? 0;
  const jobMin = job.minLpa ?? job.maxLpa ?? 0;
  const desiredMin = targetMinLpa ?? 0;
  const desiredMax = targetMaxLpa ?? Number.POSITIVE_INFINITY;

  // Overlap between [jobMin, jobMax] and [desiredMin, desiredMax].
  const overlapLow = Math.max(jobMin, desiredMin);
  const overlapHigh = Math.min(jobMax, desiredMax);

  if (overlapHigh >= overlapLow) {
    return {
      score: max,
      explanation: `The salary range overlaps your target (${desiredMin}–${desiredMax === Infinity ? '∞' : desiredMax} LPA).`,
    };
  }

  // No overlap: fall off based on how far below target the job tops out.
  const shortfall = desiredMin - jobMax;
  const tolerance = Math.max(desiredMin * 0.15, 1);
  if (shortfall <= tolerance) {
    return {
      score: Math.round(max * 0.6),
      explanation: 'The salary is slightly below your target but close enough to consider.',
    };
  }

  return {
    score: Math.round(max * 0.2),
    explanation: `The salary tops out at ${jobMax} LPA, below your target of ${desiredMin} LPA.`,
  };
}

function scoreExperience(candidate: CandidateInput, job: JobInput) {
  const max = SCORE_WEIGHTS.experience;
  const years = candidate.yearsExperience;
  const title = normalize(job.title);

  if (years <= 0) {
    return {
      score: Math.round(max * 0.5),
      explanation: 'Add your years of experience to score experience fit.',
    };
  }

  // Infer a seniority signal from the title; this is a soft signal only.
  if (/\b(senior|lead|staff|principal|architect)\b/.test(title)) {
    return years >= 3
      ? { score: max, explanation: `Your ${years} years of experience suit this senior role.` }
      : {
          score: Math.round(max * 0.4),
          explanation: 'This senior role may expect more experience than you have.',
        };
  }

  if (/\b(junior|intern|entry|graduate|trainee)\b/.test(title)) {
    return years >= 4
      ? {
          score: Math.round(max * 0.5),
          explanation: 'This is an early-career role and may underuse your experience.',
        }
      : { score: max, explanation: 'Your experience level fits this early-career role.' };
  }

  return {
    score: Math.round(max * 0.8),
    explanation: 'Your experience level is a reasonable fit for this role.',
  };
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

export function scoreJob(candidate: CandidateInput, job: JobInput): ScoreResult {
  const skills = scoreSkills(candidate, job);
  const title = scoreTitle(candidate, job);
  const location = scoreLocation(candidate, job);
  const salary = scoreSalary(candidate, job);
  const experience = scoreExperience(candidate, job);

  const reasons: ScoreReason[] = [
    { factor: 'skills', label: 'Technical skills', score: skills.score, max: SCORE_WEIGHTS.skills, explanation: skills.explanation },
    { factor: 'title', label: 'Job-title relevance', score: title.score, max: SCORE_WEIGHTS.title, explanation: title.explanation },
    { factor: 'location', label: 'Location compatibility', score: location.score, max: SCORE_WEIGHTS.location, explanation: location.explanation },
    { factor: 'salary', label: 'Salary compatibility', score: salary.score, max: SCORE_WEIGHTS.salary, explanation: salary.explanation },
    { factor: 'experience', label: 'Experience compatibility', score: experience.score, max: SCORE_WEIGHTS.experience, explanation: experience.explanation },
  ];

  const breakdown: ScoreBreakdown = {
    skills: skills.score,
    title: title.score,
    location: location.score,
    salary: salary.score,
    experience: experience.score,
  };

  const rawTotal = reasons.reduce((sum, reason) => sum + reason.score, 0);
  const score = Math.max(0, Math.min(100, Math.round(rawTotal)));

  const notes: string[] = [];
  if (job.skills.length === 0) notes.push('This job lists no required skills.');
  if (job.minLpa == null && job.maxLpa == null) notes.push('This job does not publish a salary range.');
  if (!job.location) notes.push('This job does not state a location.');

  return {
    score,
    breakdown,
    reasons,
    matchedSkills: skills.matched,
    missingSkills: skills.missing,
    notes,
  };
}
