
# AllocateMe — Project Specification
> DISCLAIMER: This spec was written with the assistance of Claude Code

## 1. Overview

**AllocateMe** is a simple, no-nonsense web app for fair allocation of limited options among a group of participants. A host creates an event with a list of options (each with a capacity), shares a link/code, and participants submit their ranked preferences. The host can review and manage submissions, then run the **Serial Dictatorship** algorithm to allocate options fairly. Results are visible only to the host.

### Example Use Case

A university professor has 15 dissertation projects but 40 students. Each project can take 2–3 students. Students rank their preferred projects. The algorithm allocates projects to maximise overall satisfaction, with ties broken by submission order (first-come-first-served).

---

## 2. Tech Stack

| Layer       | Technology                     | Purpose                                    |
| ----------- | ------------------------------ | ------------------------------------------ |
| Frontend    | Next.js 16 (App Router, React 19) | UI, routing, server-side rendering        |
| Backend     | Next.js API Routes             | REST API endpoints, algorithm execution     |
| Database    | Supabase (PostgreSQL)          | Persistent storage, Row Level Security      |
| Auth        | None (link-based access)       | Secret admin links, participant join codes  |
| Email       | Resend (currently disabled)    | Allocation + verification emails           |
| Hosting     | Vercel (recommended)           | Deployment, serverless functions            |
| Styling     | Tailwind CSS v4                | Utility-first CSS                          |

---

## 3. Core Concepts

### 3.1 Event

An event is the central entity. It contains:

- **Title** — e.g. "CS301 Project Allocation"
- **Description** (optional) — instructions for participants
- **Options** — a list of things to allocate, each with a name, optional description, and a **capacity** (how many participants can be assigned to it)
- **Admin token** — a secret URL token that gives the creator full control (SHA256-hashed in DB; shown once at creation, unrecoverable)
- **Join code** — a short, human-friendly code (e.g. `PROJ-7X2K`) that participants use to find the event
- **Status** — `open` (accepting submissions), `closed` (no more submissions), or `allocated` (algorithm has run)
- **Email verification required** — boolean, set at creation time
- **Expires at** — 30 days after creation, after which the event and all its data are deleted

### 3.2 Submission

A submission is a participant's ranked preference list:

- **Email** — unique per event, used as the participant's identity
- **Rankings** — an ordered subset of the event's options (1st choice, 2nd choice, etc.)
- **Submitted at** — timestamp, used for FCFS tie-breaking
- **Verified** — boolean (only relevant if email verification is enabled)

### 3.3 Allocation Result

After the host runs the algorithm:

- Each participant is assigned to at most one option
- Some participants may be **unassigned** if all their ranked options are full
- Results are stored and visible only to the host

---

## 4. User Flows

### 4.1 Host: Create Event

```
1. Host visits homepage → clicks "Create Event"
2. Fills in:
   - Event title
   - Description (optional)
   - Whether email verification is required (toggle, default off)
3. Adds options:
   - Each option has: name, description (optional), capacity (default 1)
   - Can add/remove options dynamically
   - Can bulk-import options via CSV upload
4. Clicks "Create"
5. Receives:
   - Admin link (e.g. /event/abc123/admin?token=secret456)
   - Join code (e.g. PROJ-7X2K)
   - Shareable participant link (e.g. /join/PROJ-7X2K)
   - Prompted to bookmark/save the admin link (cannot be recovered)
```

### 4.2 Participant: Submit Rankings

```
1. Participant visits the join link or enters the join code on the homepage
2. Sees the event title, description, and list of options
3. Enters their email address
4. If email verification is ON:
   - Clicks "Send Code" → a 6-digit code is generated and stored
     (In production: sent via Resend. Currently: visible at /dev/inbox)
   - A code input appears inline with a link to the dev inbox
   - Participant enters the code and clicks "Verify"
   - Submit button is disabled until verified
5. Ranks options via drag-and-drop (must rank at least 1)
6. Clicks "Submit Rankings"
7. Sees a confirmation page
```

### 4.3 Host: Manage Event

```
1. Host visits their admin link
2. Dashboard shows:
   - Event details and status badge
   - Join code and join link (copyable)
   - Number of submissions
   - List of all submissions (email + timestamp + verified status)
3. Host can:
   - View each submission's ranked options
   - Delete individual submissions (e.g. spam/untrusted emails)
   - Close the event (stops accepting new submissions)
   - Reopen the event (if not yet allocated)
   - Run the allocation algorithm (only when event is closed)
   - View results after allocation
```

### 4.4 Host: Run Allocation & View Results

```
1. Host closes the event
2. Clicks "Run Allocation"
3. Algorithm runs (Serial Dictatorship, FCFS order)
4. Results page shows:
   - For each option: which participants were assigned
   - List of unassigned participants (if any)
5. Host can:
   - Export results as CSV
   - Preview the allocation emails that would have been sent
```

---

## 5. Serial Dictatorship Algorithm

The algorithm is straightforward:

```
Input:
  - options: list of {id, capacity}
  - submissions: list of {email, rankings[], submitted_at}
    (sorted by submitted_at ascending — first come, first served)

Algorithm:
  1. Sort submissions by submitted_at (ascending)
  2. Initialize remaining_capacity[option] = option.capacity for all options
  3. Initialize assignments = {}
  4. For each submission (in FCFS order):
     a. For each option in their rankings (in preference order):
        i.  If remaining_capacity[option] > 0:
            - Assign this participant to this option
            - remaining_capacity[option] -= 1
            - Break (move to next participant)
     b. If no option was available: participant is unassigned

Output:
  - assignments: Map<submission_id, option_id>
  - unassigned: string[] of submission IDs
```

**Properties:**
- **Strategy-proof** — no participant can benefit by misreporting their preferences
- **Deterministic** — same inputs always produce same outputs
- **Fair by arrival order** — earlier submitters get priority
- **Pareto efficient** — no reassignment can make someone better off without making someone worse off

---

## 6. Database Schema (Supabase / PostgreSQL)

### `events`

| Column               | Type          | Notes                                |
| -------------------- | ------------- | ------------------------------------ |
| `id`                 | uuid (PK)     | Auto-generated                       |
| `title`              | text          | Required                             |
| `description`        | text          | Optional                             |
| `join_code`          | text (unique) | 8-char alphanumeric, e.g. PROJ-7X2K  |
| `admin_token`        | text          | SHA256-hashed; shown once at creation |
| `status`             | enum          | `open`, `closed`, `allocated`        |
| `email_verification` | boolean       | Default false                        |
| `created_at`         | timestamptz   | Auto                                 |
| `expires_at`         | timestamptz   | created_at + 30 days                 |

### `options`

| Column        | Type       | Notes                     |
| ------------- | ---------- | ------------------------- |
| `id`          | uuid (PK)  | Auto-generated            |
| `event_id`    | uuid (FK)  | References events.id      |
| `name`        | text       | Required                  |
| `description` | text       | Optional                  |
| `capacity`    | integer    | Default 1, minimum 1      |
| `sort_order`  | integer    | Display ordering          |

### `submissions`

| Column         | Type        | Notes                              |
| -------------- | ----------- | ---------------------------------- |
| `id`           | uuid (PK)   | Auto-generated                     |
| `event_id`     | uuid (FK)   | References events.id               |
| `email`        | text        | Unique per event                   |
| `rankings`     | uuid[]      | Ordered array of option IDs        |
| `verified`     | boolean     | Default true (false if pending verification) |
| `submitted_at` | timestamptz | Auto — used for FCFS ordering      |

**Unique constraint:** `(event_id, email)` — one submission per email per event.

**Note on email verification flow:** When verification is enabled, a placeholder submission (rankings: [], verified: false) is created immediately when the participant requests a code. Rankings are updated and verified=true set after the code is confirmed.

### `verification_codes`

| Column          | Type        | Notes                     |
| --------------- | ----------- | ------------------------- |
| `id`            | uuid (PK)   | Auto-generated            |
| `submission_id` | uuid (FK)   | References submissions.id |
| `code`          | text        | 6-digit numeric string    |
| `expires_at`    | timestamptz | created_at + 15 minutes   |

### `allocations`

| Column          | Type       | Notes                                              |
| --------------- | ---------- | -------------------------------------------------- |
| `id`            | uuid (PK)  | Auto-generated                                     |
| `event_id`      | uuid (FK)  | References events.id                               |
| `submission_id` | uuid (FK)  | References submissions.id                          |
| `option_id`     | uuid (FK)  | References options.id (nullable — null = unassigned) |

---

## 7. API Routes

All routes are under `/api/`.

### Event Management

| Method | Route                       | Auth        | Description                           |
| ------ | --------------------------- | ----------- | ------------------------------------- |
| POST   | `/api/events`               | None        | Create a new event                    |
| GET    | `/api/events/join/[code]`   | None        | Get public event info by join code    |
| GET    | `/api/events/[id]/admin`    | Admin token | Get full event details + options      |
| PATCH  | `/api/events/[id]/admin`    | Admin token | Update event status (open/closed)     |
| POST   | `/api/events/[id]/allocate` | Admin token | Run the allocation algorithm          |
| GET    | `/api/events/[id]/results`  | Admin token | Get allocation results (JSON or CSV)  |
| GET    | `/api/events/[id]/emails`   | Admin token | Get allocation email previews         |

### Submissions

| Method | Route                                    | Auth        | Description              |
| ------ | ---------------------------------------- | ----------- | ------------------------ |
| POST   | `/api/events/[id]/submissions`           | None        | Submit rankings          |
| GET    | `/api/events/[id]/submissions`           | Admin token | List all submissions     |
| DELETE | `/api/events/[id]/submissions/[subId]`   | Admin token | Delete a submission      |

### Verification

| Method | Route                       | Auth | Description                                      |
| ------ | --------------------------- | ---- | ------------------------------------------------ |
| POST   | `/api/events/[id]/verify`   | None | Send verification code (`{ email }`) or confirm it (`{ submission_id, code }`) |

### Development

| Method | Route             | Auth | Description                                   |
| ------ | ----------------- | ---- | --------------------------------------------- |
| GET    | `/api/dev/inbox`  | None | List pending verification code emails for dev |

### Admin Token Auth

The admin token is passed as a query parameter (`?token=xxx`) or in the `Authorization: Bearer` header. The backend SHA256-hashes the provided value and compares it against the hash stored in the database.

---

## 8. Pages (Next.js App Router)

| Route                            | Description                                                         |
| -------------------------------- | ------------------------------------------------------------------- |
| `/`                              | Homepage — "Create Event" button + join code input + how-it-works   |
| `/create`                        | Event creation form with CSV bulk import                            |
| `/event/[id]/admin`              | Host dashboard (requires `?token=` query param)                     |
| `/event/[id]/admin/results`      | Allocation results grouped by option, CSV export                    |
| `/event/[id]/admin/emails`       | Preview of allocation emails (in lieu of actual sending)            |
| `/join/[joinCode]`               | Participant submission page — inline email verification if required  |
| `/join/[joinCode]/success`       | Confirmation page after submission                                  |
| `/dev/inbox`                     | Dev-only simulated email inbox for verification codes               |

---

## 9. Key Implementation Details

### Admin Token Security
- SHA256-hashed before storage; never stored in plaintext
- Raw token shown exactly once at creation and cannot be recovered
- All admin routes validate the token hash before any operation

### Email Verification Flow (Inline)
Verification is handled entirely on the `/join/[joinCode]` page, not on a separate `/verify` page:
1. Participant enters email and clicks "Send Code"
2. An unverified placeholder submission is created immediately (preserving FCFS position)
3. A 6-digit code is generated, stored in `verification_codes` with a 15-minute expiry
4. The code input appears inline; a link to `/dev/inbox` is shown for testing
5. On correct code entry, the submission is marked `verified: true`
6. The "Submit Rankings" button is enabled only after verification succeeds
7. Submitting rankings updates the existing verified submission (no new row inserted)

### Email Sending (Currently Disabled)
Resend integration is in place but all `resend.emails.send()` calls are commented out:
- **Allocation emails:** `src/lib/email.ts` — mocked to return `{ sent: n, failed: 0 }`
- **Verification emails:** `src/app/api/events/[id]/verify/route.ts` — code stored but not sent
- To re-enable: uncomment the Resend calls and set `RESEND_API_KEY` + `EMAIL_FROM`

### Development Inbox (`/dev/inbox`)
Simulates a mailbox for testing without a real email provider:
- Queries all rows in `verification_codes` joined with submissions and events
- Displays the email address, subject, rendered HTML body, and time until expiry
- Auto-refreshes every 10 seconds
- Also linked from the join page after a code is sent

### FCFS Ordering
Submissions are ordered by `submitted_at` (ascending) both in the admin dashboard and in the allocation algorithm. When email verification is enabled, `submitted_at` is set at code-request time (not at ranking submission time), preserving the participant's place in the queue.

### Drag-and-Drop Ranking (`src/components/ranking-list.tsx`)
- Two sections: "Your Rankings" (ordered) and "Available Options" (unranked pool)
- Full-item hit detection with midpoint-based insertion indicator
- Fallback controls: move up/down buttons and remove button on ranked items, add button on available items

### CSV Handling (Create Page)
- Papa Parse for client-side CSV import
- Template download available
- Bulk-adds options to the in-progress form (does not submit immediately)

---

## 10. Security Considerations

- **Admin tokens** are SHA256-hashed in the database (never stored in plain text). The raw token is shown once at creation and cannot be recovered.
- **Rate limiting** on submission and verification endpoints — not yet implemented (Phase 6).
- **Input validation** on all endpoints (email format, rankings reference valid option IDs, etc.).
- **SQL injection prevention** — Supabase client library with parameterised queries.
- **Join codes** are randomly generated (32-char pool excluding I/O/0/1) and long enough to prevent guessing.

---

## 11. Cleanup & Expiry

- A **scheduled job** (Supabase cron or Vercel cron) runs daily to delete events where `expires_at < now()`.
- Unverified submissions older than 15 minutes should be cleaned up by the same job (not yet implemented).
- All related data (options, submissions, verification codes, allocations) is cascade-deleted with the event.

---

## 12. Future Enhancements (Out of Scope for V1)

These are explicitly **not** part of the initial build but are worth noting for later:

- Re-enable Resend for actual email sending (allocation results + verification codes)
- Rate limiting on submission and verification endpoints
- Cron job for expiry cleanup of events and unverified submissions
- Participant results view (participants can see their own allocation via their email)
- Multiple allocation algorithms (random priority, lottery, etc.)
- Statistics dashboard (popularity of options, rank distribution)
- Host accounts and event history
- Webhooks / email notifications when allocation is complete
- Option groups or categories
- Weighted preferences
- Re-running allocation with different parameters

---

## 13. Implementation Status

### Phase 1: Core Infrastructure — COMPLETE
- Supabase schema, Next.js + Tailwind scaffolding
- Supabase client (lazy Proxy pattern), auth helpers, token/code utilities
- `POST /api/events`, `GET /api/events/join/[code]`, `GET|PATCH /api/events/[id]/admin`

### Phase 2: Event Creation & Participant Flow — COMPLETE
- Create event page with dynamic options editor and CSV bulk import
- Join page with drag-and-drop ranking (`ranking-list.tsx` component)
- `POST /api/events/[id]/submissions`

### Phase 3: Host Dashboard — COMPLETE
- Admin dashboard with submission list, delete, close/reopen controls
- `GET /api/events/[id]/submissions`, `DELETE /api/events/[id]/submissions/[subId]`

### Phase 4: Allocation — COMPLETE
- Serial Dictatorship algorithm (`src/lib/algorithm.ts`)
- `POST /api/events/[id]/allocate`
- Results page with option grouping and CSV export
- `GET /api/events/[id]/results`
- Allocation email preview page and API route (`GET /api/events/[id]/emails`)

### Phase 5: Email Verification — COMPLETE (without real email provider)
- Inline verification flow on join page (no separate `/verify` page)
- `POST /api/events/[id]/verify` (send + confirm modes)
- Dev inbox page (`/dev/inbox`) and API route (`GET /api/dev/inbox`)
- Resend infrastructure present but disabled; re-enable by uncommenting

### Phase 6: Polish & Deploy — IN PROGRESS
- Animated homepage background and info section
- Error handling and loading states throughout
- Rate limiting: not yet implemented
- Cron job for expiry: not yet implemented
- Vercel deployment: not yet done
