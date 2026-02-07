import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from './db.js';
import { requireAdmin } from './adminAuth.js';
import { selectMatchup } from './matchmaking.js';
import { updateEloPair } from './elo.js';
import { importFromUrl, importQuotes } from './importer.js';
import { fingerprintQuote, normalizeQuoteText, toQuoteDTO } from './utils.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const voteLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  keyGenerator: (req) => `${req.ip}:${req.header('x-session-id') ?? 'missing-session'}`
});

const voteSchema = z.object({ winnerId: z.string().uuid(), loserId: z.string().uuid() });

app.get('/health', (_req, res) => {
  return res.status(200).json({ ok: true });
});

app.get('/api/matchup', async (req, res) => {
  const exclude = typeof req.query.exclude === 'string' ? req.query.exclude : undefined;
  const matchup = await selectMatchup(exclude);
  if (!matchup) {
    return res.status(404).json({ error: 'Not enough quotes to create a matchup.' });
  }
  return res.json(matchup);
});

app.post('/api/vote', voteLimiter, async (req, res) => {
  const sessionId = req.header('x-session-id');
  if (!sessionId || !z.string().uuid().safeParse(sessionId).success) {
    return res.status(400).json({ error: 'Missing or invalid X-Session-Id header.' });
  }

  const parsed = voteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid vote payload.' });
  }

  const { winnerId, loserId } = parsed.data;
  if (winnerId === loserId) {
    return res.status(400).json({ error: 'winnerId and loserId must be distinct.' });
  }

  await prisma.$transaction(async (tx) => {
    const quotes = await tx.quote.findMany({ where: { id: { in: [winnerId, loserId] } } });
    if (quotes.length !== 2) throw new Error('Quote not found');

    const winner = quotes.find((q) => q.id === winnerId);
    const loser = quotes.find((q) => q.id === loserId);
    if (!winner || !loser) throw new Error('Quote not found');

    const { winnerNext, loserNext } = updateEloPair(
      winner.elo,
      loser.elo,
      winner.voteCount,
      loser.voteCount
    );

    await tx.quote.update({
      where: { id: winner.id },
      data: { elo: winnerNext, wins: { increment: 1 }, voteCount: { increment: 1 } }
    });

    await tx.quote.update({
      where: { id: loser.id },
      data: { elo: loserNext, losses: { increment: 1 }, voteCount: { increment: 1 } }
    });
  });

  const exclude = typeof req.query.exclude === 'string' ? req.query.exclude : undefined;
  const matchup = await selectMatchup(exclude);
  if (!matchup) {
    return res.status(404).json({ error: 'Not enough quotes to create a matchup.' });
  }

  return res.json({ matchup });
});

app.get('/api/leaderboard', async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const quotes = await prisma.quote.findMany({ orderBy: { elo: 'desc' }, take: Number.isNaN(limit) ? 50 : limit });
  return res.json(
    quotes.map((q) => {
      const total = q.wins + q.losses;
      return {
        ...toQuoteDTO(q),
        winRate: total === 0 ? 0 : q.wins / total
      };
    })
  );
});

app.post('/api/admin/quote', requireAdmin, async (req, res) => {
  const parsed = z.object({ text: z.string().min(3) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid quote text.' });

  const text = normalizeQuoteText(parsed.data.text);
  const fingerprint = fingerprintQuote(text);

  const quote = await prisma.quote.upsert({
    where: { fingerprint },
    update: { text },
    create: { text, fingerprint }
  });

  return res.status(201).json(toQuoteDTO(quote));
});

app.post('/api/admin/import-url', requireAdmin, async (req, res) => {
  const parsed = z.object({ url: z.string().url() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid URL.' });

  try {
    const result = await importFromUrl(parsed.data.url);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/admin/import-lines', requireAdmin, async (req, res) => {
  const parsed = z.object({ lines: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid lines input.' });

  const lines = parsed.data.lines.split('\n').map((l) => l.trim()).filter(Boolean);
  const result = await importQuotes(lines);
  return res.json(result);
});

app.get('/api/admin/quotes', requireAdmin, async (_req, res) => {
  const quotes = await prisma.quote.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return res.json(quotes.map(toQuoteDTO));
});

app.delete('/api/admin/quote/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid quote id.' });

  await prisma.quote.delete({ where: { id } });
  return res.status(204).send();
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(port, () => {
  // intentional single startup log
  console.log(`Server listening on ${port}`);
});
