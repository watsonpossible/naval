import { clamp } from './utils.js';

export const expectedScore = (ra: number, rb: number): number => 1 / (1 + 10 ** ((rb - ra) / 400));

export const dynamicK = (voteCount: number): number =>
  clamp(16, 64, Math.round(32 + 32 * Math.exp(-voteCount / 10)));

export const updateEloPair = (
  winnerElo: number,
  loserElo: number,
  winnerVotes: number,
  loserVotes: number
): { winnerNext: number; loserNext: number } => {
  const winnerK = dynamicK(winnerVotes);
  const loserK = dynamicK(loserVotes);

  const winnerExpected = expectedScore(winnerElo, loserElo);
  const loserExpected = expectedScore(loserElo, winnerElo);

  return {
    winnerNext: Math.round(winnerElo + winnerK * (1 - winnerExpected)),
    loserNext: Math.round(loserElo + loserK * (0 - loserExpected))
  };
};
