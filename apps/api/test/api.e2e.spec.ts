import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './test-app';

const USERNAME = process.env.AUTH_USERNAME ?? 'admin';
const PASSWORD = process.env.AUTH_PASSWORD ?? 'test-password-123';

/**
 * End-to-end API tests. Each test drives the real HTTP stack against the test
 * database schema; nothing is mocked.
 */
describe('API (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: request.Agent;

  beforeAll(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = created.prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.job.deleteMany();
    await prisma.session.deleteMany();
    await prisma.candidateProfile.deleteMany();
    agent = request.agent(app.getHttpServer());
  });

  async function signIn(): Promise<request.Agent> {
    await agent.post('/api/auth/login').send({ username: USERNAME, password: PASSWORD }).expect(200);
    return agent;
  }

  describe('health', () => {
    it('reports database connectivity without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/health').expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.checks.database).toBe('up');
    });
  });

  describe('authentication', () => {
    it('rejects protected routes when not signed in', async () => {
      await request(app.getHttpServer()).get('/api/jobs').expect(401);
    });

    it('rejects an incorrect password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: USERNAME, password: 'definitely-wrong' })
        .expect(401);
    });

    it('signs in and reports the current user', async () => {
      const session = await signIn();
      const response = await session.get('/api/auth/me').expect(200);
      expect(response.body.data.username).toBe(USERNAME);
    });

    it('invalidates the session on logout', async () => {
      const session = await signIn();
      await session.post('/api/auth/logout').expect(200);
      await session.get('/api/jobs').expect(401);
    });

    it('never exposes the password hash', async () => {
      const session = await signIn();
      const response = await session.get('/api/auth/me').expect(200);
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });
  });

  describe('candidate profile', () => {
    it('creates, reads back and reports completeness', async () => {
      const session = await signIn();
      const payload = {
        name: 'Test User',
        headline: 'Senior React Developer',
        yearsExperience: 4,
        skills: ['React', 'TypeScript', 'React'],
        preferredTitles: ['Senior React Developer'],
        preferredLocations: ['Bengaluru'],
        remoteOpen: true,
        targetMinLpa: 18,
        targetMaxLpa: 25,
      };
      const saved = await session.put('/api/candidate/profile').send(payload).expect(200);
      expect(saved.body.data.skills).toEqual(['React', 'TypeScript']);
      expect(saved.body.data.completeness.score).toBeGreaterThan(0);

      const read = await session.get('/api/candidate/profile').expect(200);
      expect(read.body.data.headline).toBe('Senior React Developer');
    });

    it('rejects an inverted salary range', async () => {
      const session = await signIn();
      await session
        .put('/api/candidate/profile')
        .send({ targetMinLpa: 30, targetMaxLpa: 10 })
        .expect(400);
    });

    it('rejects unknown fields', async () => {
      const session = await signIn();
      await session.put('/api/candidate/profile').send({ hacker: true }).expect(400);
    });
  });

  describe('jobs', () => {
    const job = {
      title: 'Senior React Developer',
      company: 'Acme',
      description: 'Build things with React.',
      skills: ['React', 'TypeScript'],
      minLpa: 20,
      maxLpa: 28,
      workMode: 'REMOTE',
      location: 'Remote',
      sourceUrl: 'https://acme.example.com/jobs/1',
    };

    it('runs the full create-read-update-status-delete lifecycle', async () => {
      const session = await signIn();

      const created = await session.post('/api/jobs').send(job).expect(201);
      const id = created.body.data.id;
      expect(created.body.data.status).toBe('SAVED');

      const read = await session.get(`/api/jobs/${id}`).expect(200);
      expect(read.body.data.title).toBe(job.title);

      const updated = await session
        .put(`/api/jobs/${id}`)
        .send({ title: 'Staff React Developer' })
        .expect(200);
      expect(updated.body.data.title).toBe('Staff React Developer');

      const status = await session
        .patch(`/api/jobs/${id}/status`)
        .send({ status: 'INTERVIEW' })
        .expect(200);
      expect(status.body.data.status).toBe('INTERVIEW');

      await session.delete(`/api/jobs/${id}`).expect(200);
      await session.get(`/api/jobs/${id}`).expect(404);
    });

    it('rejects a duplicate source URL', async () => {
      const session = await signIn();
      await session.post('/api/jobs').send(job).expect(201);
      await session
        .post('/api/jobs')
        .send({ ...job, title: 'Different title', company: 'Other' })
        .expect(409);
    });

    it('rejects a duplicate title and company at a new URL', async () => {
      const session = await signIn();
      await session.post('/api/jobs').send(job).expect(201);
      await session
        .post('/api/jobs')
        .send({ ...job, sourceUrl: 'https://acme.example.com/jobs/2' })
        .expect(409);
    });

    it('validates the payload', async () => {
      const session = await signIn();
      await session.post('/api/jobs').send({ company: 'Acme' }).expect(400);
      await session.post('/api/jobs').send({ ...job, sourceUrl: 'not-a-url' }).expect(400);
    });

    it('filters by work mode and paginates', async () => {
      const session = await signIn();
      await session.post('/api/jobs').send(job).expect(201);
      await session
        .post('/api/jobs')
        .send({
          ...job,
          title: 'Onsite Developer',
          company: 'Beta',
          workMode: 'ONSITE',
          sourceUrl: 'https://beta.example.com/jobs/1',
        })
        .expect(201);

      const remote = await session.get('/api/jobs?workMode=REMOTE').expect(200);
      expect(remote.body.data.total).toBe(1);

      const paged = await session.get('/api/jobs?page=1&pageSize=1').expect(200);
      expect(paged.body.data.items).toHaveLength(1);
      expect(paged.body.data.totalPages).toBe(2);
    });

    it('reports status counts', async () => {
      const session = await signIn();
      const created = await session.post('/api/jobs').send(job).expect(201);
      await session
        .patch(`/api/jobs/${created.body.data.id}/status`)
        .send({ status: 'OFFER' })
        .expect(200);

      const stats = await session.get('/api/jobs/stats').expect(200);
      expect(stats.body.data.OFFER).toBe(1);
    });
  });

  describe('matching', () => {
    it('returns an explainable, ranked score for a job', async () => {
      const session = await signIn();
      await session
        .put('/api/candidate/profile')
        .send({
          yearsExperience: 4,
          skills: ['React', 'TypeScript', 'Node.js'],
          preferredTitles: ['Senior React Developer'],
          preferredLocations: ['Bengaluru'],
          remoteOpen: true,
          targetMinLpa: 18,
          targetMaxLpa: 25,
        })
        .expect(200);
      await session
        .post('/api/jobs')
        .send({
          title: 'Senior React Developer',
          company: 'Acme',
          description: 'React and TypeScript.',
          skills: ['React', 'TypeScript', 'Node.js'],
          minLpa: 20,
          maxLpa: 28,
          workMode: 'REMOTE',
          sourceUrl: 'https://acme.example.com/jobs/match',
        })
        .expect(201);

      const response = await session.get('/api/jobs/matches').expect(200);
      const [match] = response.body.data.matches;
      expect(match.score).toBeGreaterThan(0);
      expect(match.score).toBeLessThanOrEqual(100);
      expect(match.reasons).toHaveLength(5);
      expect(match.matchedSkills.map((skill: string) => skill.toLowerCase())).toContain('react');
    });

    it('reports when the profile is missing', async () => {
      const session = await signIn();
      const response = await session.get('/api/jobs/matches').expect(200);
      expect(response.body.data.profileReady).toBe(false);
      expect(response.body.data.matches).toEqual([]);
    });
  });
});
