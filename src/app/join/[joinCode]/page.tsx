"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RankingList from "@/components/ranking-list";

interface Option {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  sort_order: number;
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  email_verification: boolean;
  options: Option[];
}

export default function JoinPage() {
  const params = useParams<{ joinCode: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [rankings, setRankings] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch event data by join code
  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/join/${params.joinCode}`);
        if (!res.ok) {
          setError("Event not found. Check your join code and try again.");
          return;
        }
        const data = await res.json();
        if (data.status !== "open") {
          setError("This event is no longer accepting submissions.");
          return;
        }
        setEvent(data);
      } catch {
        setError("Failed to load event. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [params.joinCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (rankings.length === 0) {
      setSubmitError("Please rank at least one option.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/events/${event!.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          rankings,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Failed to submit. Please try again.");
        return;
      }

      router.push(`/join/${params.joinCode}/success`);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading event...</p>
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md px-6 text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Oops</h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-lg px-6 py-12">
        <h1 className="text-3xl font-bold text-primary mb-1">{event.title}</h1>
        {event.description && (
          <p className="text-muted mb-6">{event.description}</p>
        )}

        {submitError && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Email */}
        <div className="mb-6">
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Your Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-12 w-full rounded-lg border border-border bg-surface px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            required
          />
          <p className="text-xs text-muted mt-1">
            One submission per email address.
          </p>
        </div>

        {/* Rankings */}
        <div className="mb-8">
          <RankingList
            options={event.options}
            rankings={rankings}
            onChange={setRankings}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || rankings.length === 0}
          className="h-12 w-full rounded-lg bg-primary font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Rankings"}
        </button>
      </form>
    </div>
  );
}
