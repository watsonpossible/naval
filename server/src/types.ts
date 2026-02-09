export type QuoteDTO = {
  id: string;
  text: string;
  elo: number;
  wins: number;
  losses: number;
  voteCount: number;
};

export type MatchupResponse = {
  left: QuoteDTO;
  right: QuoteDTO;
};

export type QuoteRecord = QuoteDTO & {
  createdAt?: Date;
  fingerprint?: string;
};
