# AssignMe

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A web app for fairly allocating limited options among a group of participants. Built to solve the common problem of assigning resources (like dissertation projects, lab slots, or tutorial groups) when demand exceeds supply.

## The Problem

A professor has 15 dissertation projects but 40 students. Each project can take 2-3 students. Everyone has preferences, and someone has to figure out who gets what. Doing this manually is tedious, and spreadsheets don't scale. AssignMe automates the process using a well-known fair allocation algorithm.

## How It Works

1. A host creates an event and adds the available options (each with a capacity). Options can be added manually or bulk-imported via CSV.
2. Participants join via a short code or link, then drag-and-drop rank their preferences.
3. If email verification is enabled, participants verify their address with a 6-digit code before submitting.
4. The host closes submissions and runs the allocation.
5. The **Serial Dictatorship** algorithm assigns participants to options based on their rankings, with ties broken by submission order (first come, first served).
6. The host views the results, exports a CSV, and previews the notification emails.

No accounts needed. Hosts get a secret admin link shown once at creation; participants just need the join code.

## The Algorithm

AssignMe uses [Serial Dictatorship](https://en.wikipedia.org/wiki/Serial_dictatorship), a strategy-proof allocation mechanism:

- Participants are ordered by submission time (FCFS)
- Each participant, in order, is assigned their highest-ranked option that still has capacity
- If none of a participant's ranked options have capacity, they are left unassigned

This is deterministic, Pareto efficient, and impossible to game — there is no benefit to misreporting your preferences.

## Tech Stack

- **Next.js 16** (App Router, React 19, Turbopack) — Frontend and API routes
- **Supabase** (PostgreSQL) — Database with row-level security
- **Tailwind CSS v4** — Styling ([Autumn Harvest](https://coolors.co/palette/6f1d1b-bb9457-432818-99582a-ffe6a7) colour palette)
- **Resend** — Email (allocation results + verification codes; disabled by default)
- **Vercel** — Deployment with daily cron for event expiry

## Project Structure

```
src/
  app/
    api/                  API routes
      cron/cleanup/       Daily cron job — deletes expired events
      events/             Event CRUD, submissions, allocation, results, verification
      dev/inbox/          Dev-only: simulated email inbox (404 in production)
    create/               Event creation page
    event/[id]/admin/     Host dashboard, results, email preview
    join/[joinCode]/      Participant ranking + inline email verification
    dev/inbox/            Dev-only: view emails that would have been sent (404 in production)
  components/
    ranking-list.tsx      Drag-and-drop option ranking component
  lib/
    algorithm.ts          Serial Dictatorship implementation
    auth.ts               Admin token extraction and verification
    email.ts              Allocation email builder (Resend, currently disabled)
    supabase.ts           Lazy-initialised Supabase clients
    types.ts              Shared TypeScript types
    utils.ts              Token generation, join code generation, SHA256 hashing
supabase/                 Database schema
uml/                      PlantUML diagrams (class + activity)
spec.md                   Full project specification
vercel.json               Vercel cron configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- (Optional) A [Resend](https://resend.com) account for real email sending

### Setup

```bash
git clone https://github.com/your-username/AssignMe.git
cd AssignMe
npm install
```

Create a `.env.local` file (see `.env.example` for all options):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_secret_key
CRON_SECRET=any_random_string   # used to authenticate the cleanup cron in production
```

Apply the database schema in your Supabase project:

```bash
# Paste the contents of supabase/schema.sql into the Supabase SQL editor, or use the CLI:
supabase db push
```

Then start the dev server:

```bash
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Yes | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | Yes | Supabase secret key (server-side only) |
| `CRON_SECRET` | Yes (prod) | Secret used to authenticate the cleanup cron job |
| `RESEND_API_KEY` | No | Resend API key — enables real email sending |
| `EMAIL_FROM` | No | Sender address, e.g. `AssignMe <noreply@yourdomain.com>` |

## Email Sending

Email sending via Resend is **disabled by default**. In this mode:

- **Verification codes** appear at `/dev/inbox` (auto-refreshes every 10 seconds). The join page links there directly after a code is requested.
- **Allocation result emails** are not sent, but can be previewed at `/event/[id]/admin/emails`.

To enable real email sending, uncomment the Resend calls in `src/lib/email.ts` and `src/app/api/events/[id]/verify/route.ts`, then set `RESEND_API_KEY` and `EMAIL_FROM` in your environment.

## Testing

```bash
npm run test              # Unit tests (Vitest)
npm run test:watch        # Unit tests in watch mode
npm run test:coverage     # Unit tests with coverage report
npm run test:e2e          # End-to-end tests (Playwright)
npm run test:e2e:ui       # Playwright with interactive UI
```

## Deploying to Vercel

1. Push the repository to GitHub and import it in the [Vercel dashboard](https://vercel.com/new).

2. Set the following environment variables in **Project → Settings → Environment Variables**:

   | Variable | Notes |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | |
   | `SUPABASE_SECRET_KEY` | |
   | `CRON_SECRET` | Generate with `openssl rand -hex 32` |
   | `RESEND_API_KEY` | Optional |
   | `EMAIL_FROM` | Optional |

3. Deploy. The `vercel.json` in the repo registers a daily cron job (`/api/cron/cleanup`) that automatically deletes events older than 30 days.

4. Ensure all foreign keys in your Supabase schema have `ON DELETE CASCADE` so that deleting an event cascades to its options, submissions, allocations, and verification codes.

> **Note:** The `/dev/inbox` page and `/api/dev/inbox` endpoint return 404 in production automatically — no configuration needed.

## License

MIT
