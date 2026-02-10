"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

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
  join_code: string;
  status: "open" | "closed" | "allocated";
  email_verification: boolean;
  created_at: string;
  expires_at: string;
  options: Option[];
  submission_count: number;
}

interface Submission {
  id: string;
  email: string;
  rankings: string[];
  verified: boolean;
  submitted_at: string;
}

export default function AdminDashboard() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [event, setEvent] = useState<EventData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    if (!token) {
      setError("No admin token provided.");
      setLoading(false);
      return;
    }

    try {
      const [eventRes, subsRes] = await Promise.all([
        fetch(`/api/events/${params.id}/admin`, { headers: authHeader }),
        fetch(`/api/events/${params.id}/submissions`, { headers: authHeader }),
      ]);

      if (!eventRes.ok) {
        setError(eventRes.status === 403 ? "Invalid admin token." : "Failed to load event.");
        return;
      }

      const eventData = await eventRes.json();
      setEvent(eventData);

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubmissions(subsData.submissions);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleStatus() {
    if (!event || event.status === "allocated") return;
    setStatusUpdating(true);

    const newStatus = event.status === "open" ? "closed" : "open";

    try {
      const res = await fetch(`/api/events/${params.id}/admin?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setEvent({ ...event, status: newStatus });
      }
    } finally {
      setStatusUpdating(false);
    }
  }

  async function runAllocation() {
    if (!confirm("Run the allocation? This action cannot be undone.")) return;
    setAllocating(true);
    setAllocateError(null);

    try {
      const res = await fetch(`/api/events/${params.id}/allocate`, {
        method: "POST",
        headers: authHeader,
      });

      if (res.ok) {
        router.push(`/event/${params.id}/admin/results?token=${token}`);
      } else {
        const data = await res.json();
        setAllocateError(data.error ?? "Allocation failed.");
      }
    } catch {
      setAllocateError("Network error. Please try again.");
    } finally {
      setAllocating(false);
    }
  }

  async function deleteSubmission(subId: string) {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    setDeletingId(subId);

    try {
      const res = await fetch(`/api/events/${params.id}/submissions/${subId}`, {
        method: "DELETE",
        headers: authHeader,
      });

      if (res.ok) {
        setSubmissions(submissions.filter((s) => s.id !== subId));
        if (event) {
          setEvent({ ...event, submission_count: event.submission_count - 1 });
        }
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function optionName(optionId: string): string {
    return event?.options.find((o) => o.id === optionId)?.name ?? "Unknown option";
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading dashboard...</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────
  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md px-6 text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Access Denied</h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  const statusColors = {
    open: "bg-green-100 text-green-800",
    closed: "bg-yellow-100 text-yellow-800",
    allocated: "bg-blue-100 text-blue-800",
  };

  const joinUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${event.join_code}`;

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-3xl font-bold text-primary">{event.title}</h1>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${statusColors[event.status]}`}
            >
              {event.status}
            </span>
          </div>
          {event.description && (
            <p className="text-muted mb-4">{event.description}</p>
          )}

          {/* Join code + link sharing */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-foreground">Join Code:</span>
            <code className="rounded bg-surface px-2 py-1 font-mono text-foreground border border-border">
              {event.join_code}
            </code>
            <button
              onClick={() => copyToClipboard(event.join_code, "code")}
              className="text-accent hover:text-accent-hover transition-colors"
            >
              {copied === "code" ? "Copied!" : "Copy code"}
            </button>
            <span className="text-border">|</span>
            <button
              onClick={() => copyToClipboard(joinUrl, "link")}
              className="text-accent hover:text-accent-hover transition-colors"
            >
              {copied === "link" ? "Copied!" : "Copy join link"}
            </button>
          </div>
        </div>

        {/* Status controls */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {event.status !== "allocated" && (
            <button
              onClick={toggleStatus}
              disabled={statusUpdating}
              className={`h-10 rounded-lg px-4 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                event.status === "open"
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {statusUpdating
                ? "Updating..."
                : event.status === "open"
                  ? "Close Submissions"
                  : "Reopen Submissions"}
            </button>
          )}
          {event.status === "closed" && (
            <button
              onClick={runAllocation}
              disabled={allocating}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {allocating ? "Allocating..." : "Run Allocation"}
            </button>
          )}
          {event.status === "open" && (
            <span className="text-sm text-muted">
              Close submissions before running the allocation.
            </span>
          )}
          {event.status === "allocated" && (
            <a
              href={`/event/${params.id}/admin/results?token=${token}`}
              className="h-10 inline-flex items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              View Results
            </a>
          )}
          {event.status === "allocated" && (
            <span className="text-sm text-muted">
              Allocation has been run. Status is final.
            </span>
          )}
          {allocateError && (
            <p className="w-full text-sm text-red-600">{allocateError}</p>
          )}
        </div>

        {/* Submissions */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Submissions ({submissions.length})
          </h2>

          {submissions.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface/40 p-8 text-center">
              <p className="text-muted">No submissions yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {submissions.map((sub, index) => (
                <div
                  key={sub.id}
                  className="rounded-lg border border-border bg-surface/40"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Priority number */}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>

                    {/* Email + time */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {sub.email}
                      </p>
                      <p className="text-xs text-muted">
                        {formatTime(sub.submitted_at)}
                        {!sub.verified && (
                          <span className="ml-2 text-yellow-600">(unverified)</span>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === sub.id ? null : sub.id)
                      }
                      className="text-sm text-accent hover:text-accent-hover transition-colors"
                    >
                      {expandedId === sub.id ? "Hide" : "Rankings"}
                    </button>
                    <button
                      onClick={() => deleteSubmission(sub.id)}
                      disabled={deletingId === sub.id}
                      className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      {deletingId === sub.id ? "..." : "Delete"}
                    </button>
                  </div>

                  {/* Expanded rankings */}
                  {expandedId === sub.id && (
                    <div className="border-t border-border px-4 py-3">
                      <ol className="list-decimal list-inside text-sm text-foreground space-y-1">
                        {sub.rankings.map((optId) => (
                          <li key={optId}>{optionName(optId)}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
