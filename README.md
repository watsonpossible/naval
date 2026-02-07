# Naval Quote Battles

Production-ready SPA for anonymous pairwise voting on Naval Ravikant quotes with Elo rankings.

## Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: Postgres + Prisma ORM
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Deploy**: Railway

## Features

- Endless pairwise voting (`/`) with no skip behavior
- Elo leaderboard (`/leaderboard`) showing top 50 with Elo, votes, and win rate
- Anonymous voting session via `X-Session-Id`
- Vote abuse prevention via rate limiting (IP + session)
- Admin console (`/admin`) with token auth (`ADMIN_TOKEN`)
- Admin actions:
  - Add one quote
  - Import quotes from URL
  - Bulk import one-quote-per-line
  - Delete quote (removes only that quote and its counters)
- Matchmaking strategy:
  - 80% similar Elo matching, 20% random exploration
  - avoids immediate repeats with `exclude` ids
- No vote history table, only per-quote counters + Elo

## Elo details

- Starting Elo: `1200`
- Base K: `32`
- Dynamic K (deterministic):

```txt
dynamicK = clamp(16, 64, round(32 + 32 * exp(-voteCount/10)))
```

- Expected score:

```txt
Ea = 1 / (1 + 10^((Rb - Ra)/400))
```

- Update:

```txt
Ra' = Ra + K*(Sa - Ea)
```

Elo is stored as integers (computed as float then rounded).

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Set environment variables in `server/.env`:

```env
DATABASE_URL=postgresql://...
ADMIN_TOKEN=your-secret-token
PORT=3000
NODE_ENV=development
```

3. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Run dev servers (Express + Vite):

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## API overview

- `GET /api/matchup?exclude=id1,id2`
- `POST /api/vote?exclude=id1,id2` body `{ winnerId, loserId }`, header `X-Session-Id`
- `GET /api/leaderboard?limit=50`
- Admin (Bearer token required):
  - `POST /api/admin/quote`
  - `POST /api/admin/import-url`
  - `POST /api/admin/import-lines`
  - `GET /api/admin/quotes`
  - `DELETE /api/admin/quote/:id`

## Railway deployment

1. Create a Railway project and add a **Postgres** service.
2. Connect this repository.
3. Set Railway environment variables:
   - `DATABASE_URL`
   - `ADMIN_TOKEN`
   - `NODE_ENV=production`
   - `PORT` (Railway usually injects this automatically)
4. Railway runs `railway.json` deploy command:

```bash
npm run prisma:deploy && npm run start
```

5. App listens on `process.env.PORT` and serves SPA from Express in production.

## Import notes

- URL import fetches and parses HTML with `undici` + `cheerio`.
- It tries to extract quote list items under headings containing “Quotes” first, then falls back to obvious list items.
- Quote cleaning + dedupe:
  - normalize whitespace and smart quotes
  - fingerprint-based exact dedupe
  - near-duplicate merging via Levenshtein ratio `>= 0.92`
- URL import is idempotent.


## Railway troubleshooting

- If Railway shows **"Failed to get private network endpoint"** in the Networking tab, this is usually a Railway control-plane/networking issue (or private networking not yet provisioned), not an application code bug.
- Your web app can still work via **Public Networking**. Click **Generate Domain** and use that URL.
- Ensure the service has these vars set: `DATABASE_URL`, `ADMIN_TOKEN`, `NODE_ENV=production`.
- This repo now exposes `GET /health` and Railway is configured to health-check that endpoint.
- If startup fails, check deploy logs for Prisma errors; migrations run on boot via `npm run prisma:deploy`.
