import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../api';
import type { LeaderboardQuote } from '../types';

const LeaderboardPage = () => {
  const [quotes, setQuotes] = useState<LeaderboardQuote[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard().then(setQuotes).catch((err) => setError((err as Error).message));
  }, []);

  if (error) return <div className="py-12 text-red-400">{error}</div>;

  return (
    <div>
      <h1 className="mb-6 text-3xl">Top 50 Quotes</h1>
      <div className="space-y-4">
        {quotes.map((q, idx) => (
          <article key={q.id} className="rounded border border-zinc-800 p-5">
            <p className="text-lg leading-relaxed">{idx + 1}. {q.text}</p>
            <p className="mt-3 text-xs uppercase tracking-wider text-zinc-400">
              Elo {q.elo} · Votes {q.voteCount} · Win Rate {(q.winRate * 100).toFixed(1)}%
            </p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardPage;
