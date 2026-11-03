import { CandidateProfile, Job } from '@prisma/client';

type ScoreResult = {
  score: number;
  breakdown: {
    skills: number;
    title: number;
    location: number;
    salary: number;
    experience: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
};

const normalize = (value: string) => value.trim().toLowerCase();

export function scoreJob(candidate: CandidateProfile, job: Job): ScoreResult {
  const candidateSkills = [...new Set(candidate.skills.map(normalize))];
  const jobSkills = [...new Set(job.skills.map(normalize))];
  const matchedSkills = jobSkills.filter((skill) => candidateSkills.includes(skill));
  const missingSkills = jobSkills.filter((skill) => !candidateSkills.includes(skill));

  const skills = jobSkills.length
    ? Math.round((matchedSkills.length / jobSkills.length) * 40)
    : 20;

  const titleText = normalize(job.title);
  const roleTerms = ['react', 'frontend', 'front-end', 'full stack', 'fullstack', 'mern', 'node', 'software engineer'];
  const title = roleTerms.some((term) => titleText.includes(term)) ? 20 : 8;

  const locationText = normalize(job.location || '');
  const locationMatches = candidate.preferredLocations.some((location) =>
    locationText.includes(normalize(location)) || normalize(location).includes(locationText),
  );
  const location = job.workMode === 'REMOTE' && candidate.remoteOpen
    ? 15
    : locationMatches
      ? 15
      : job.workMode === 'HYBRID' && candidate.remoteOpen
        ? 10
        : 4;

  let salary = 8;
  if (candidate.targetMinLpa != null && job.maxLpa != null) {
    if (job.maxLpa >= candidate.targetMinLpa) salary = 15;
    else if (job.maxLpa >= candidate.targetMinLpa * 0.85) salary = 9;
    else salary = 3;
  }

  // Experience is a soft signal until the candidate's exact history and job requirements are parsed.
  const experience = 10;

  const breakdown = { skills, title, location, salary, experience };
  const score = Math.max(0, Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0)));
  return { score, breakdown, matchedSkills, missingSkills };
}
