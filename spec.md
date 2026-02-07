
# AllocateMe — Project Specification
> DISCLAIMER: This spec was written with the assistance of Claude Code

## 1. Overview

**AllocateMe** is a simple, no-nonsense web app for fair allocation of limited options among a group of participants. A host creates an event with a list of options (each with a capacity), shares a link/code, and participants submit their ranked preferences. The host can review and manage submissions, then run the **Serial Dictatorship** algorithm to allocate options fairly. Results are visible only to the host.

### Example Use Case

A university professor has 15 dissertation projects but 40 students. Each project can take 2–3 students. Students rank their preferred projects. The algorithm allocates projects to maximize overall satisfaction, with ties broken by submission order (first-come-first-served).

---

## 2. Tech Stack

| Layer       | Technology                     | Purpose                                    |
| ----------- | ------------------------------ | ------------------------------------------ |
| Frontend    | Next.js (App Router, React 18) | UI, routing, server-side rendering          |
| Backend     | Next.js API Routes             | REST API endpoints, algorithm execution     |
| Database    | Supabase (PostgreSQL)          | Persistent storage, Row Level Security      |
| Auth        | None (link-based access)       | Secret admin links, participant join codes   |
| Email       | Supabase Edge Functions or Resend | Optional verification emails            |
| Hosting     | Vercel (recommended)           | Deployment, serverless functions            |
| Styling     | Tailwind CSS                   | Utility-first CSS                          |

---

## 3. Core Concepts

### 3.1 Event

An event is the central entity. It contains:

- **Title** — e.g. "CS301 Project Allocation"
- **Description** (optional) — instructions for participants
- **Options** — a list of things to allocate, each with a name, optional description, and a **capacity** (how many participants can be assigned to it)
- **Admin token** — a secret URL token that gives the creator full control
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
4. Ranks options via drag-and-drop (they can rank as many or as few as they like,
   but must rank at least 1)
5. Clicks "Submit"
6. If email verification is OFF:
   - Submission is saved immediately
   - Participant sees a confirmation message
7. If email verification is ON:
   - A 6-digit verification code is sent to their email
   - They enter the code on the next screen
   - Once verified, submission is saved
   - Unverified submissions are discarded after 15 minutes
```

### 4.3 Host: Manage Event

```
1. Host visits their admin link
2. Dashboard shows:
   - Event details and status
   - Number of submissions
   - List of all submissions (email + timestamp + verified status)
3. Host can:
   - View each submission's rankings
   - Delete individual submissions (e.g. spam/untrusted emails)
   - Close the event (stops accepting new submissions)
   - Reopen the event (if not yet allocated)
   - Run the allocation algorithm (only when event is closed)
   - View results after allocation
   - Copy the join link / join code for sharing
```

### 4.4 Host: Run Allocation & View Results

```
1. Host closes the event
2. Clicks "Run Allocation"
3. Algorithm runs (Serial Dictatorship, FCFS order)
4. Results page shows:
   - For each option: which participants were assigned to it
   - List of unassigned participants (if any)
   - A note explaining unassigned participants didn't get any of their ranked choices
5. Host can export results as CSV
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
  - assignments: {participant_email → option_id}
  - unassigned: list of participant emails
```

**Properties:**
- **Strategy-proof** — no participant can benefit by misreporting their preferences
- **Deterministic** — same inputs always produce same outputs
- **Fair by arrival order** — earlier submitters get priority
- **Pareto efficient** — no reassignment can make someone better off without making someone worse off

---

## 6. Database Schema (Supabase / PostgreSQL)

### `events`

| Column                    | Type         | Notes                                |
| ------------------------- | ------------ | ------------------------------------ |
| `id`                      | uuid (PK)    | Auto-generated                       |
| `title`                   | text         | Required                             |
| `description`             | text         | Optional                             |
| `join_code`               | text (unique)| 8-char alphanumeric, e.g. PROJ-7X2K  |
| `admin_token`             | text         | Secret, hashed (bcrypt or sha256)    |
| `status`                  | enum         | `open`, `closed`, `allocated`        |
| `email_verification`      | boolean      | Default false                        |
| `created_at`              | timestamptz  | Auto                                 |
| `expires_at`              | timestamptz  | created_at + 30 days                 |

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

| Column        | Type        | Notes                              |
| ------------- | ----------- | ---------------------------------- |
| `id`          | uuid (PK)   | Auto-generated                     |
| `event_id`    | uuid (FK)   | References events.id               |
| `email`       | text        | Unique per event                   |
| `rankings`    | uuid[]      | Ordered array of option IDs        |
| `verified`    | boolean     | Default true (false if pending)    |
| `submitted_at`| timestamptz | Auto — used for FCFS ordering      |

**Unique constraint:** `(event_id, email)` — one submission per email per event.

### `verification_codes`

| Column        | Type        | Notes                              |
| ------------- | ----------- | ---------------------------------- |
| `id`          | uuid (PK)   | Auto-generated                     |
| `submission_id`| uuid (FK)  | References submissions.id          |
| `code`        | text        | 6-digit code                       |
| `expires_at`  | timestamptz | created_at + 15 minutes            |

### `allocations`

| Column         | Type       | Notes                      |
| -------------- | ---------- | -------------------------- |
| `id`           | uuid (PK)  | Auto-generated             |
| `event_id`     | uuid (FK)  | References events.id       |
| `submission_id`| uuid (FK)  | References submissions.id  |
| `option_id`    | uuid (FK)  | References options.id (nullable — null = unassigned) |

---

## 7. API Routes (Next.js API Routes)

All routes are under `/api/`.

### Event Management

| Method | Route                          | Auth          | Description                  |
| ------ | ------------------------------ | ------------- | ---------------------------- |
| POST   | `/api/events`                  | None          | Create a new event           |
| GET    | `/api/events/[joinCode]`       | None          | Get public event info         |
| GET    | `/api/events/[id]/admin`       | Admin token   | Get full event details        |
| PATCH  | `/api/events/[id]/admin`       | Admin token   | Update event (close/reopen)   |
| POST   | `/api/events/[id]/allocate`    | Admin token   | Run the allocation algorithm  |
| GET    | `/api/events/[id]/results`     | Admin token   | Get allocation results        |
| GET    | `/api/events/[id]/results/csv` | Admin token   | Export results as CSV         |

### Submissions

| Method | Route                              | Auth        | Description                  |
| ------ | ---------------------------------- | ----------- | ---------------------------- |
| POST   | `/api/events/[id]/submissions`     | None        | Submit rankings              |
| GET    | `/api/events/[id]/submissions`     | Admin token | List all submissions          |
| DELETE | `/api/events/[id]/submissions/[subId]` | Admin token | Delete a submission      |

### Verification

| Method | Route                                  | Auth | Description              |
| ------ | -------------------------------------- | ---- | ------------------------ |
| POST   | `/api/events/[id]/verify`              | None | Verify email with code   |

### Admin Token Auth

The admin token is passed as a query parameter (`?token=xxx`) or in the `Authorization` header. The backend compares it against the hashed value stored in the database.

---

## 8. Pages (Next.js App Router)

| Route                              | Description                                      |
| ---------------------------------- | ------------------------------------------------ |
| `/`                                | Homepage — "Create Event" button + "Enter Join Code" input |
| `/create`                          | Event creation form                              |
| `/event/[id]/admin`                | Host dashboard (requires `?token=` query param)  |
| `/event/[id]/admin/results`        | Allocation results page                          |
| `/join/[joinCode]`                 | Participant submission page                      |
| `/join/[joinCode]/verify`          | Email verification code entry (if required)      |
| `/join/[joinCode]/success`         | Confirmation page after submission               |

---

## 9. UI/UX Principles

- **Minimal and functional** — no unnecessary decoration, clear labels, obvious actions
- **Mobile-friendly** — responsive layout, touch-friendly drag-and-drop
- **Accessible** — proper form labels, keyboard navigation, ARIA attributes
- **Clear feedback** — loading states, success/error messages, confirmation dialogs for destructive actions
- **No login required** — everything is link-based

### Key UI Components

- **Option ranking** — drag-and-drop list. Participants move options from an "available" pool into a "my rankings" list. Numbered positions show rank order.
- **Admin dashboard** — simple table of submissions with delete buttons. Status badge for event state. Big "Run Allocation" button when closed.
- **Results view** — grouped by option, showing assigned emails. Separate section for unassigned participants.

---

## 10. Security Considerations

- **Admin tokens** are hashed in the database (never stored in plain text). The raw token is shown once at creation and cannot be recovered.
- **Rate limiting** on submission and verification endpoints to prevent abuse.
- **Input validation** on all endpoints (email format, rankings reference valid option IDs, etc.).
- **CSRF protection** via SameSite cookies or token-based protection on mutation endpoints.
- **SQL injection prevention** — use Supabase client library with parameterised queries (never raw SQL interpolation).
- **Join codes** are randomly generated and sufficiently long to prevent guessing.

---

## 11. Cleanup & Expiry

- A **scheduled job** (Supabase cron or Vercel cron) runs daily to delete events where `expires_at < now()`.
- Unverified submissions older than 15 minutes are cleaned up by the same job.
- All related data (options, submissions, verification codes, allocations) is cascade-deleted with the event.

---

## 12. Future Enhancements (Out of Scope for V1)

These are explicitly **not** part of the initial build but are worth noting for later:

- Participant results view (participants can see their own allocation via their email)
- Multiple allocation algorithms (random priority, lottery, etc.)
- Statistics dashboard (popularity of options, rank distribution)
- Host accounts and event history
- Participant accounts to track allocations across events
- Webhooks / email notifications when allocation is complete
- Option groups or categories
- Weighted preferences
- Re-running allocation with different parameters

---

## 13. Development Phases

### Phase 1: Core Infrastructure
- Supabase project setup, schema creation
- Next.js project scaffolding with Tailwind CSS
- API routes for event CRUD

### Phase 2: Event Creation & Participant Flow
- Create event page and API
- Join page with option ranking UI (drag-and-drop)
- Submission API

### Phase 3: Host Dashboard
- Admin dashboard with submission management
- Close/reopen event functionality
- Delete submission functionality

### Phase 4: Allocation
- Serial Dictatorship algorithm implementation
- Allocation API endpoint
- Results page with CSV export

### Phase 5: Email Verification
- Email sending (Resend or Supabase)
- Verification code flow
- Cleanup of expired codes

### Phase 6: Polish & Deploy
- Error handling and edge cases
- Mobile responsiveness
- Rate limiting
- Cron job for expiry cleanup
- Deploy to Vercel + Supabase
