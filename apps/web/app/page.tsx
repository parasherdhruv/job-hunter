'use client';

import { useEffect, useState } from 'react';

type Match = {
  score: number;
  breakdown: Record<string, number>;
  matchedSkills: string[];
  missingSkills: string[];
  job: { id: string; title: string; company: string; location: string | null; workMode: string; sourceUrl: string; minLpa: number | null; maxLpa: number | null };
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/jobs/matches`)
      .then(async (response) => {
        if (!response.ok) throw new Error('API request failed');
        return response.json();
      })
      .then((data) => setMatches(data.matches || []))
      .catch(() => setError('Could not connect to the API. Start the backend and configure NEXT_PUBLIC_API_URL.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <header>
        <div>
          <span className="pill">YOUR JOB SEARCH WORKSPACE</span>
          <h1 style={{ marginTop: 12 }}>Autonomous Job Hunter</h1>
          <p>Find relevant engineering roles, understand your match, and track applications.</p>
        </div>
        <span className="pill">Phase 1 · Foundation</span>
      </header>

      <section className="grid">
        <div className="metric"><small>Target compensation</small><strong>₹18–25 LPA</strong></div>
        <div className="metric"><small>Primary profile</small><strong>Full Stack / MERN</strong></div>
        <div className="metric"><small>Discovery status</small><strong>Manual intake</strong></div>
      </section>

      <section className="panel">
        <h2>Top job matches</h2>
        <p>Matches are ranked using an explainable rules-based score. Add jobs through the API to see them here.</p>
        {loading && <p>Loading matches…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && matches.length === 0 && (
          <p>No jobs yet. Phase 1 is ready for candidate profile setup and job intake.</p>
        )}
        {matches.map((match) => (
          <article key={match.job.id} style={{ borderTop: '1px solid #eaecf0', padding: '18px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: '0 0 6px' }}>{match.job.title}</h3>
                <strong>{match.job.company}</strong>
                <p>{match.job.location || 'Location not specified'} · {match.job.workMode}</p>
                <small>Matched: {match.matchedSkills.join(', ') || 'No skill overlap recorded'}</small>
              </div>
              <div><span className="pill">{match.score}/100 match</span></div>
            </div>
            <p><a href={match.job.sourceUrl} target="_blank" rel="noreferrer">Open original vacancy ↗</a></p>
          </article>
        ))}
      </section>

      <section className="panel">
        <h2>Next milestone</h2>
        <p>Connect permitted job sources and scheduled discovery, then add alerts and application tracking. No job applications will be submitted without your approval.</p>
      </section>
    </main>
  );
}
