import { useEffect, useMemo, useState } from 'react';
import QuoteCard from '../components/QuoteCard';
import { fetchMatchup, submitVote } from '../api';
import type { Matchup } from '../types';

const HomePage = () => {
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVote, setPendingVote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPair, setLastPair] = useState<string[]>([]);

  const excludeIds = useMemo(() => lastPair, [lastPair]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const next = await fetchMatchup(excludeIds);
        setMatchup(next);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const castVote = async (winnerId: string, loserId: string) => {
    try {
      setPendingVote(true);
      const next = await submitVote(winnerId, loserId, excludeIds);
      setLastPair([winnerId, loserId]);
      if (next.left.id === winnerId || next.left.id === loserId || next.right.id === winnerId || next.right.id === loserId) {
        const retry = await fetchMatchup([winnerId, loserId]);
        setMatchup(retry);
      } else {
        setMatchup(next);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPendingVote(false);
    }
  };

  if (loading) return <div className="py-24 text-zinc-400">Loading matchup...</div>;
  if (error) return <div className="py-24 text-red-400">{error}</div>;
  if (!matchup) {
    return <div className="py-24 text-zinc-300">Not enough quotes yet. Ask an admin to add/import quotes.</div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm uppercase tracking-[0.25em] text-zinc-400">Pick the better quote</p>
      <div className="grid gap-6 md:grid-cols-2">
        <QuoteCard
          quote={matchup.left}
          disabled={pendingVote}
          sideLabel="Left"
          onChoose={() => castVote(matchup.left.id, matchup.right.id)}
        />
        <QuoteCard
          quote={matchup.right}
          disabled={pendingVote}
          sideLabel="Right"
          onChoose={() => castVote(matchup.right.id, matchup.left.id)}
        />
      </div>
    </div>
  );
};

export default HomePage;
