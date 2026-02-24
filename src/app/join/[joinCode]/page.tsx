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

type VerifyStep = "idle" | "sending" | "code_sent" | "verifying" | "verified";

export default function JoinPage() {
  const params = useParams<{ joinCode: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [rankings, setRankings] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Verification state
  const [verifyStep, setVerifyStep] = useState<VerifyStep>("idle");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);

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

  // ── Email verification handlers ────────────────────────────────

  async function sendCode() {
    setVerifyError(null);
    setVerifyStep("sending");

    try {
      const res = await fetch(`/api/events/${event!.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVerifyError(data.error ?? "Failed to send verification code.");
        setVerifyStep("idle");
        return;
      }

      setSubmissionId(data.submission_id);
      setVerifyStep("code_sent");
    } catch {
      setVerifyError("Network error. Please try again.");
      setVerifyStep("idle");
    }
  }

  async function confirmCode() {
    setVerifyError(null);
    setVerifyStep("verifying");

    try {
      const res = await fetch(`/api/events/${event!.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVerifyError(data.error ?? "Verification failed.");
        setVerifyStep("code_sent");
        return;
      }

      setVerifyStep("verified");
    } catch {
      setVerifyError("Network error. Please try again.");
      setVerifyStep("code_sent");
    }
  }

  // ── Submit rankings ────────────────────────────────────────────

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

  // ── Derived state ──────────────────────────────────────────────

  const isVerified = !event?.email_verification || verifyStep === "verified";
  const canSubmit = isVerified && rankings.length > 0 && !submitting;
  const emailLocked = verifyStep !== "idle" && verifyStep !== "sending";

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading event...</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
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
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Your Email
          </label>
          <div className="flex gap-2">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={emailLocked}
              className="h-12 flex-1 rounded-lg border border-border bg-surface px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-60"
              required
            />
            {event.email_verification && verifyStep !== "verified" && (
              <button
                type="button"
                onClick={sendCode}
                disabled={
                  !email ||
                  verifyStep === "sending" ||
                  verifyStep === "verifying"
                }
                className="h-12 shrink-0 rounded-lg bg-secondary px-4 text-sm font-medium text-white hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                {verifyStep === "sending" ? "Sending..." : verifyStep === "code_sent" ? "Resend" : "Send Code"}
              </button>
            )}
            {verifyStep === "verified" && (
              <span className="flex h-12 items-center px-3 text-sm font-medium text-green-700">
                Verified
              </span>
            )}
          </div>
          {!event.email_verification && (
            <p className="text-xs text-muted mt-1">One submission per email address.</p>
          )}
        </div>

        {/* Verification code input */}
        {event.email_verification && verifyStep !== "idle" && verifyStep !== "verified" && (
          <div className="mb-6 rounded-lg border border-border bg-surface/40 px-4 py-4">
            <p className="text-sm text-muted mb-1">
              A 6-digit code was sent to <strong className="text-foreground">{email}</strong>. Enter it below.
            </p>
            <a
              href="/dev/inbox"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:text-accent-hover transition-colors underline"
            >
              Open dev inbox to view the code &rarr;
            </a>
            <div className="mt-3" />
            {verifyError && (
              <p className="mb-3 text-sm text-red-600">{verifyError}</p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="h-12 w-36 rounded-lg border border-border bg-surface px-4 font-mono text-lg tracking-widest text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={confirmCode}
                disabled={code.length !== 6 || verifyStep === "verifying"}
                className="h-12 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {verifyStep === "verifying" ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        )}

        {event.email_verification && verifyStep === "verified" && (
          <p className="mb-6 text-sm text-green-700">
            Email verified. You can now submit your rankings.
          </p>
        )}

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
          disabled={!canSubmit}
          className="h-12 w-full rounded-lg bg-primary font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Rankings"}
        </button>

        {event.email_verification && !isVerified && rankings.length > 0 && (
          <p className="mt-3 text-center text-sm text-muted">
            Verify your email above to enable submission.
          </p>
        )}
      </form>
    </div>
  );
}
