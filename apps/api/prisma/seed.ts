import { PrismaClient, JobSource, WorkMode } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Development seed. Creates the candidate profile and a handful of jobs that
 * resemble the user's real targets. Safe to re-run: jobs are upserted by
 * sourceUrl so no duplicates accumulate.
 */
async function main(): Promise<void> {
  await prisma.candidateProfile.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      name: 'Dhruv Parasher',
      headline: 'Senior Full Stack / MERN Developer',
      yearsExperience: 4,
      skills: [
        'React',
        'Next.js',
        'TypeScript',
        'JavaScript',
        'Node.js',
        'NestJS',
        'Express',
        'MongoDB',
        'PostgreSQL',
        'Redis',
        'GraphQL',
        'Tailwind CSS',
        'Docker',
      ],
      preferredTitles: [
        'Senior React Developer',
        'Senior Frontend Engineer',
        'Senior Full Stack Engineer',
        'MERN Developer',
        'Node.js Developer',
      ],
      preferredLocations: ['Anywhere in India', 'Delhi NCR', 'Bengaluru', 'Pune', 'Hyderabad'],
      remoteOpen: true,
      targetMinLpa: 18,
      targetMaxLpa: 25,
    },
    update: {},
  });

  const jobs = [
    {
      title: 'Senior React Developer',
      company: 'Northwind Technologies',
      location: 'Bengaluru, India',
      workMode: WorkMode.REMOTE,
      description:
        'We are hiring a Senior React Developer to build data-rich dashboards. You will own the frontend architecture, mentor engineers and work closely with design.',
      skills: ['React', 'TypeScript', 'Next.js', 'Redux', 'GraphQL'],
      minLpa: 20,
      maxLpa: 28,
      source: JobSource.COMPANY_SITE,
      sourceUrl: 'https://example.com/careers/northwind-senior-react-developer',
    },
    {
      title: 'Senior Full Stack Engineer (MERN)',
      company: 'Acme Cloud',
      location: 'Remote, India',
      workMode: WorkMode.REMOTE,
      description:
        'Build end-to-end features across a React frontend and Node.js microservices. Experience with PostgreSQL and cloud deployment is a plus.',
      skills: ['React', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'Docker'],
      minLpa: 18,
      maxLpa: 26,
      source: JobSource.API,
      sourceUrl: 'https://example.com/careers/acme-cloud-full-stack-engineer',
    },
    {
      title: 'Frontend Engineer',
      company: 'Bright Labs',
      location: 'Pune, India',
      workMode: WorkMode.HYBRID,
      description:
        'Join a product team building customer-facing web apps with React and TypeScript. Hybrid working model with three days in the office.',
      skills: ['React', 'TypeScript', 'CSS', 'Jest'],
      minLpa: 14,
      maxLpa: 19,
      source: JobSource.MANUAL,
      sourceUrl: 'https://example.com/careers/bright-labs-frontend-engineer',
    },
    {
      title: 'Backend Node.js Developer',
      company: 'DataForge',
      location: 'Hyderabad, India',
      workMode: WorkMode.ONSITE,
      description:
        'Design and build REST and GraphQL APIs with Node.js and PostgreSQL. Strong database fundamentals required.',
      skills: ['Node.js', 'NestJS', 'PostgreSQL', 'Redis', 'GraphQL'],
      minLpa: 16,
      maxLpa: 22,
      source: JobSource.RSS,
      sourceUrl: 'https://example.com/careers/dataforge-backend-node-developer',
    },
    {
      title: 'Senior Frontend Engineer',
      company: 'Pixel Studio',
      location: 'Remote',
      workMode: WorkMode.REMOTE,
      description:
        'Own the design system and component library for a growing SaaS product. Deep React and TypeScript expertise required.',
      skills: ['React', 'TypeScript', 'Tailwind CSS', 'Storybook', 'Next.js'],
      minLpa: 22,
      maxLpa: 30,
      source: JobSource.COMPANY_SITE,
      sourceUrl: 'https://example.com/careers/pixel-studio-senior-frontend-engineer',
    },
    {
      title: 'Junior Web Developer',
      company: 'Startup Hub',
      location: 'Delhi NCR, India',
      workMode: WorkMode.ONSITE,
      description:
        'Entry-level role maintaining marketing websites. Great opportunity for someone starting their career.',
      skills: ['JavaScript', 'HTML', 'CSS', 'WordPress'],
      minLpa: 4,
      maxLpa: 7,
      source: JobSource.MANUAL,
      sourceUrl: 'https://example.com/careers/startup-hub-junior-web-developer',
    },
  ];

  for (const job of jobs) {
    await prisma.job.upsert({
      where: { sourceUrl: job.sourceUrl },
      create: job,
      update: { ...job, status: undefined },
    });
  }

  // A couple of jobs in a progressed state so the tracking view is populated.
  await prisma.job.updateMany({
    where: { sourceUrl: 'https://example.com/careers/acme-cloud-full-stack-engineer' },
    data: { status: 'INTERVIEW' },
  });
  await prisma.job.updateMany({
    where: { sourceUrl: 'https://example.com/careers/bright-labs-frontend-engineer' },
    data: { status: 'APPLIED' },
  });
  await prisma.job.updateMany({
    where: { sourceUrl: 'https://example.com/careers/startup-hub-junior-web-developer' },
    data: { status: 'REJECTED' },
  });

  console.log(`Seeded candidate profile and ${jobs.length} jobs.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
