# AllocateMe

A web app for fairly allocating limited options among a group of participants. Built to solve the common problem of assigning resources (like dissertation projects, lab slots, or tutorial groups) when demand exceeds supply.

## The Problem

A professor has 15 dissertation projects but 40 students. Each project can take 2-3 students. Everyone has preferences, and someone has to figure out who gets what. Doing this manually is tedious, and spreadsheets don't scale. AllocateMe automates the process using a well-known fair allocation algorithm.

## How It Works

1. A host creates an event and adds the available options (each with a capacity). Options can be added manually or bulk-imported via CSV.
2. Participants join via a short code or link, then drag-and-drop rank their preferences.
3. If email verification is enabled, participants verify their address with a 6-digit code before submitting.
4. The host closes submissions and runs the allocation.
5. The **Serial Dictatorship** algorithm assigns participants to options based on their rankings, with ties broken by submission order (first come, first served).
6. The host views the results, exports a CSV, and previews the notification emails.

No accounts needed. Hosts get a secret admin link shown once at creation; participants just need the join code.

## Tech Stack

- **Next.js 16** (App Router, React 19) - Frontend and API routes
- **Supabase** (PostgreSQL) - Database with row-level security
- **Tailwind CSS v4** - Styling ([Autumn Harvest](https://coolors.co/palette/6f1d1b-bb9457-432818-99582a-ffe6a7) colour palette from [Coolors](https://coolors.co))
- **Resend** - Email (allocation results + verification codes; currently disabled for development)
- **Vercel** - Deployment

## The Algorithm

AllocateMe uses [Serial Dictatorship](https://en.wikipedia.org/wiki/Serial_dictatorship), a strategy-proof allocation mechanism:

- Participants are ordered by submission time (FCFS)
- Each participant, in order, is assigned their highest-ranked option that still has capacity
- If none of a participant's ranked options have capacity, they are left unassigned

This is deterministic, Pareto efficient, and impossible to game — there is no benefit to misreporting your preferences.

## Project Structure

```
src/
  app/
    api/                  API routes
      events/             Event CRUD, submissions, allocation, results, verification
      dev/inbox/          Dev-only: simulated email inbox
    create/               Event creation page
    event/[id]/admin/     Host dashboard, results, email preview
    join/[joinCode]/      Participant ranking + inline email verification
    dev/inbox/            Dev-only: view emails that would have been sent
  components/
    ranking-list.tsx      Drag-and-drop option ranking component
  lib/
    algorithm.ts          Serial Dictatorship implementation
    auth.ts               Admin token extraction and verification
    email.ts              Allocation email builder (Resend, currently disabled)
    supabase.ts           Lazy-initialised Supabase clients
    types.ts              Shared TypeScript types
    utils.ts              Token generation, join code generation, SHA256 hashing
supabase/                 Database migrations
uml/                      PlantUML diagrams (class + activity)
spec.md                   Full project specification
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- (Optional) A [Resend](https://resend.com) API key for email sending

### Setup

```bash
git clone https://github.com/your-username/AllocateMe.git
cd AllocateMe
npm install
```

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_secret_key
RESEND_API_KEY=your_resend_key   # optional — see note below
EMAIL_FROM=AllocateMe <you@yourdomain.com>  # optional
```

Run the database migrations in your Supabase project (see `supabase/migrations/`), then:

```bash
npm run dev
```

### Email Sending

Email sending via Resend is **disabled by default**. In this mode:

- **Verification codes** are stored in the database and visible at `/dev/inbox` (auto-refreshes every 10 seconds). The join page links directly to the inbox after a code is requested.
- **Allocation result emails** are not sent, but can be previewed at `/event/[id]/admin/emails`.

To enable real email sending, uncomment the Resend calls in `src/lib/email.ts` and `src/app/api/events/[id]/verify/route.ts`, then set `RESEND_API_KEY` and `EMAIL_FROM` in your environment.

## Status

Core features are complete. See `spec.md` for the full specification and implementation status.

## License

MIT
