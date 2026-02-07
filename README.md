# AllocateMe

A web app for fairly allocating limited options among a group of participants. Built to solve the common problem of assigning resources (like dissertation projects, lab slots, or tutorial groups) when demand exceeds supply.

## The Problem

A professor has 15 dissertation projects but 40 students. Each project can take 2-3 students. Everyone has preferences, and someone has to figure out who gets what. Doing this manually is tedious, and spreadsheets don't scale. AllocateMe automates the process using a well-known fair allocation algorithm.

## How It Works

1. A host creates an event and adds the available options (each with a capacity).
2. Participants join via a short code or link, then drag-and-drop rank their preferences.
3. The host closes submissions and runs the allocation.
4. The **Serial Dictatorship** algorithm assigns participants to options based on their rankings, with ties broken by submission order (first come, first served).
5. The host views and exports the results.

No accounts needed. Hosts get a secret admin link, participants just need the join code.

## Tech Stack

- **Next.js** (App Router) - Frontend and API routes
- **Supabase** (PostgreSQL) - Database with row-level security
- **Tailwind CSS** - Styling
- **Vercel** - Deployment

## The Algorithm

AllocateMe uses [Serial Dictatorship](https://en.wikipedia.org/wiki/Serial_dictatorship), a strategy-proof allocation mechanism:

- Participants are ordered by submission time (FCFS)
- Each participant, in order, is assigned their highest-ranked option that still has capacity
- If none of a participant's ranked options have capacity, they are left unassigned

This is deterministic, Pareto efficient, and impossible to game — there is no benefit to misreporting your preferences.

## Project Structure

```
app/              Next.js pages and API routes
components/       Reusable React components
lib/              Utilities (Supabase client, algorithm, auth helpers)
supabase/         Database migrations
uml/              PlantUML diagrams (class + activity diagrams)
spec.md           Full project specification
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- (Optional) A [Resend](https://resend.com) API key for email verification

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
RESEND_API_KEY=your_resend_key
```

Run the database migrations in your Supabase project (see `supabase/migrations/`), then:

```bash
npm run dev
```

## Status

Work in progress. See `spec.md` for the full specification and `uml/` for architecture diagrams.

## License

MIT
