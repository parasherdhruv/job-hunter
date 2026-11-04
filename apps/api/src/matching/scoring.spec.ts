import { CandidateInput, JobInput, SCORE_WEIGHTS, scoreJob } from './scoring';

const baseCandidate: CandidateInput = {
  yearsExperience: 4,
  skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  preferredTitles: ['Senior React Developer', 'Full Stack Engineer'],
  preferredLocations: ['Bengaluru', 'Remote'],
  remoteOpen: true,
  targetMinLpa: 18,
  targetMaxLpa: 25,
};

const baseJob: JobInput = {
  title: 'Senior React Developer',
  location: 'Bengaluru, India',
  workMode: 'REMOTE',
  skills: ['React', 'TypeScript'],
  minLpa: 20,
  maxLpa: 28,
};

describe('scoreJob', () => {
  it('is deterministic for identical inputs', () => {
    const first = scoreJob(baseCandidate, baseJob);
    const second = scoreJob(baseCandidate, baseJob);
    expect(first).toEqual(second);
  });

  it('always returns a score between 0 and 100', () => {
    const cases: Array<[CandidateInput, JobInput]> = [
      [baseCandidate, baseJob],
      [{ ...baseCandidate, skills: [] }, { ...baseJob, skills: ['Rust', 'Go'] }],
      [{ ...baseCandidate, yearsExperience: 0, targetMinLpa: null, targetMaxLpa: null }, baseJob],
    ];
    for (const [candidate, job] of cases) {
      const { score } = scoreJob(candidate, job);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('gives a perfect skills score when all required skills match', () => {
    const result = scoreJob(baseCandidate, baseJob);
    expect(result.breakdown.skills).toBe(SCORE_WEIGHTS.skills);
    expect(result.missingSkills).toEqual([]);
  });

  it('reports matched and missing skills using the job spelling', () => {
    const result = scoreJob(baseCandidate, { ...baseJob, skills: ['React', 'Go', 'Kubernetes'] });
    expect(result.matchedSkills).toEqual(['React']);
    expect(result.missingSkills).toEqual(['Go', 'Kubernetes']);
  });

  it('normalizes skill aliases such as React.js and Node.js', () => {
    const result = scoreJob(
      { ...baseCandidate, skills: ['React.js', 'Node.js'] },
      { ...baseJob, skills: ['React', 'Node'] },
    );
    expect(result.matchedSkills).toEqual(['React', 'Node']);
    expect(result.breakdown.skills).toBe(SCORE_WEIGHTS.skills);
  });

  it('is case-insensitive for skills', () => {
    const result = scoreJob(
      { ...baseCandidate, skills: ['REACT'] },
      { ...baseJob, skills: ['react'] },
    );
    expect(result.matchedSkills).toEqual(['react']);
  });

  it('awards full location points for a remote job when the candidate is remote-open', () => {
    const result = scoreJob(baseCandidate, { ...baseJob, workMode: 'REMOTE', location: null });
    expect(result.breakdown.location).toBe(SCORE_WEIGHTS.location);
  });

  it('penalizes an onsite job in a non-preferred location', () => {
    const result = scoreJob(baseCandidate, {
      ...baseJob,
      workMode: 'ONSITE',
      location: 'Reykjavik, Iceland',
    });
    expect(result.breakdown.location).toBeLessThan(SCORE_WEIGHTS.location);
  });

  it('awards full salary points when ranges overlap', () => {
    const result = scoreJob(baseCandidate, { ...baseJob, minLpa: 20, maxLpa: 30 });
    expect(result.breakdown.salary).toBe(SCORE_WEIGHTS.salary);
  });

  it('reduces salary points when the job pays below target', () => {
    const result = scoreJob(baseCandidate, { ...baseJob, minLpa: 4, maxLpa: 6 });
    expect(result.breakdown.salary).toBeLessThan(SCORE_WEIGHTS.salary * 0.5);
  });

  it('handles a job with no salary information without throwing', () => {
    const result = scoreJob(baseCandidate, { ...baseJob, minLpa: null, maxLpa: null });
    expect(result.breakdown.salary).toBeGreaterThan(0);
    expect(result.notes).toContain('This job does not publish a salary range.');
  });

  it('handles a job with no listed skills using a neutral score', () => {
    const result = scoreJob(baseCandidate, { ...baseJob, skills: [] });
    expect(result.breakdown.skills).toBe(Math.round(SCORE_WEIGHTS.skills * 0.5));
    expect(result.notes).toContain('This job lists no required skills.');
  });

  it('handles an empty candidate profile safely', () => {
    const empty: CandidateInput = {
      yearsExperience: 0,
      skills: [],
      preferredTitles: [],
      preferredLocations: [],
      remoteOpen: false,
      targetMinLpa: null,
      targetMaxLpa: null,
    };
    const result = scoreJob(empty, baseJob);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.reasons).toHaveLength(5);
  });

  it('returns a reason for every factor with a bounded score', () => {
    const result = scoreJob(baseCandidate, baseJob);
    expect(result.reasons.map((reason) => reason.factor)).toEqual([
      'skills',
      'title',
      'location',
      'salary',
      'experience',
    ]);
    for (const reason of result.reasons) {
      expect(reason.score).toBeGreaterThanOrEqual(0);
      expect(reason.score).toBeLessThanOrEqual(reason.max);
      expect(reason.explanation.length).toBeGreaterThan(0);
    }
  });

  it('sums the breakdown to the total score', () => {
    const result = scoreJob(baseCandidate, baseJob);
    const sum = Object.values(result.breakdown).reduce((total, value) => total + value, 0);
    expect(result.score).toBe(Math.min(100, sum));
  });

  it('scores a strong match above a weak match', () => {
    const strong = scoreJob(baseCandidate, baseJob);
    const weak = scoreJob(baseCandidate, {
      title: 'Warehouse Operative',
      location: 'Reykjavik, Iceland',
      workMode: 'ONSITE',
      skills: ['Forklift', 'Inventory'],
      minLpa: 3,
      maxLpa: 5,
    });
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it('rewards a title that closely matches a preferred role', () => {
    const match = scoreJob(baseCandidate, { ...baseJob, title: 'Senior React Developer' });
    const mismatch = scoreJob(baseCandidate, { ...baseJob, title: 'Embedded Systems Engineer' });
    expect(match.breakdown.title).toBeGreaterThan(mismatch.breakdown.title);
  });
});
