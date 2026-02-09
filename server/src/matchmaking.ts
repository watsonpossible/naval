import { prisma } from './db.js';
import { toQuoteDTO } from './utils.js';
import type { MatchupResponse, QuoteRecord } from './types.js';

const parseExclude = (exclude?: string) =>
  exclude
    ? exclude
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

const randomFrom = <T>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)] as T;
};

const getRandomDistinctPair = async (excludeIds: string[]) => {
  const quotes = (await prisma.quote.findMany({ where: { id: { notIn: excludeIds } } })) as QuoteRecord[];
  if (quotes.length < 2) return null;

  const left = randomFrom(quotes);
  let right = randomFrom(quotes);
  while (right.id === left.id) right = randomFrom(quotes);
  return { left: toQuoteDTO(left), right: toQuoteDTO(right) };
};

export const selectMatchup = async (exclude?: string): Promise<MatchupResponse | null> => {
  const excludeIds = parseExclude(exclude);
  const quoteCount = await prisma.quote.count({ where: { id: { notIn: excludeIds } } });
  if (quoteCount < 2) return null;

  if (Math.random() < 0.2) {
    return getRandomDistinctPair(excludeIds);
  }

  const anchors = (await prisma.quote.findMany({ where: { id: { notIn: excludeIds } } })) as QuoteRecord[];
  const anchor = randomFrom(anchors);

  for (const range of [100, 200, 400]) {
    const candidates = (await prisma.quote.findMany({
      where: {
        id: { notIn: [...excludeIds, anchor.id] },
        elo: { gte: anchor.elo - range, lte: anchor.elo + range }
      }
    })) as QuoteRecord[];

    if (candidates.length > 0) {
      const opponent = randomFrom(candidates);
      return Math.random() < 0.5
        ? { left: toQuoteDTO(anchor), right: toQuoteDTO(opponent) }
        : { left: toQuoteDTO(opponent), right: toQuoteDTO(anchor) };
    }
  }

  return getRandomDistinctPair(excludeIds);
};
