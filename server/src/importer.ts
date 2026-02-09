import * as cheerio from 'cheerio';
import { fetch } from 'undici';
import { prisma } from './db.js';
import { fingerprintQuote, normalizeQuoteText, similarityRatio } from './utils.js';

const stripOuterQuotes = (text: string): string => {
  const trimmed = text.trim();
  return trimmed.replace(/^["'“”‘’]+/, '').replace(/["'“”‘’]+$/, '').trim();
};

const cleanQuote = (text: string): string => stripOuterQuotes(normalizeQuoteText(text));

const keepBestNearDuplicates = (quotes: string[]): string[] => {
  const result: string[] = [];

  for (const quote of quotes) {
    let merged = false;
    for (let i = 0; i < result.length; i += 1) {
      if (similarityRatio(result[i].toLowerCase(), quote.toLowerCase()) >= 0.92) {
        result[i] = result[i].length >= quote.length ? result[i] : quote;
        merged = true;
        break;
      }
    }

    if (!merged) result.push(quote);
  }

  return result;
};

const extractQuotesFromHtml = (html: string): string[] => {
  const $ = cheerio.load(html);
  const rawQuotes: string[] = [];

  $('h1, h2, h3, h4').each((_, el) => {
    const heading = $(el).text().toLowerCase();
    if (!heading.includes('quotes')) return;

    let next = $(el).next();
    while (next.length) {
      if (next.is('h1, h2, h3, h4')) break;
      next.find('li').each((__, li) => {
        rawQuotes.push($(li).text());
      });
      next = next.next();
    }
  });

  if (rawQuotes.length === 0) {
    $('li').each((_, li) => {
      const text = $(li).text();
      if (text.length > 35) rawQuotes.push(text);
    });
  }

  return rawQuotes;
};

const prepareQuotes = (texts: string[]) => {
  const cleaned = texts.map(cleanQuote).filter((q) => q.length > 15);
  const uniqueByFingerprint = new Map<string, string>();

  cleaned.forEach((quote) => {
    uniqueByFingerprint.set(fingerprintQuote(quote), quote);
  });

  return keepBestNearDuplicates([...uniqueByFingerprint.values()]);
};

export const importQuotes = async (inputQuotes: string[]) => {
  const prepared = prepareQuotes(inputQuotes);
  let created = 0;

  for (const quoteText of prepared) {
    const fingerprint = fingerprintQuote(quoteText);
    const existing = await prisma.quote.findUnique({ where: { fingerprint } });
    if (existing) continue;

    await prisma.quote.create({ data: { text: quoteText, fingerprint } });
    created += 1;
  }

  return { discovered: inputQuotes.length, prepared: prepared.length, created };
};

export const importFromUrl = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status})`);
  }

  const html = await response.text();
  const extracted = extractQuotesFromHtml(html);
  return importQuotes(extracted);
};
