export type Quote = {
  id: string;
  text: string;
  elo: number;
  wins: number;
  losses: number;
  voteCount: number;
};

export type Matchup = {
  left: Quote;
  right: Quote;
};

export type LeaderboardQuote = Quote & { winRate: number };
