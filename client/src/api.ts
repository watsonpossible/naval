import type { LeaderboardQuote, Matchup } from './types';

const getSessionId = (): string => {
  const key = 'session-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
};

export const fetchMatchup = async (excludeIds: string[] = []): Promise<Matchup> => {
  const query = excludeIds.length ? `?exclude=${encodeURIComponent(excludeIds.join(','))}` : '';
  const res = await fetch(`/api/matchup${query}`);
  if (!res.ok) throw new Error('Failed to load matchup');
  return res.json();
};

export const submitVote = async (
  winnerId: string,
  loserId: string,
  excludeIds: string[] = []
): Promise<Matchup> => {
  const query = excludeIds.length ? `?exclude=${encodeURIComponent(excludeIds.join(','))}` : '';
  const res = await fetch(`/api/vote${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId()
    },
    body: JSON.stringify({ winnerId, loserId })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Vote failed');
  }

  const data = await res.json();
  return data.matchup;
};

export const fetchLeaderboard = async (): Promise<LeaderboardQuote[]> => {
  const res = await fetch('/api/leaderboard?limit=50');
  if (!res.ok) throw new Error('Failed leaderboard');
  return res.json();
};

export const adminRequest = async <T>(path: string, token: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Admin request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
};
