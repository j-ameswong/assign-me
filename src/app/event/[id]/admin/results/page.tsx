"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

interface OptionResult {
  option_id: string;
  option_name: string;
  capacity: number;
  assigned: string[];
}

interface ResultsData {
  options: OptionResult[];
  unassigned: string[];
}

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    if (!token) {
      setError("No admin token provided.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/events/${params.id}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to load results.");
        return;
      }

      setResults(await res.json());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [params.id, token]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  function exportCsv() {
    window.open(
      `/api/events/${params.id}/results?token=${token}&format=csv`,
      "_blank"
    );
  }

  const totalAssigned = results?.options.reduce((sum, o) => sum + o.assigned.length, 0) ?? 0;
  const totalUnassigned = results?.unassigned.length ?? 0;

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading results...</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────
  if (error || !results) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md px-6 text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Error</h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/event/${params.id}/admin?token=${token}`}
            className="text-sm text-accent hover:text-accent-hover transition-colors"
          >
            &larr; Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold text-primary mt-2">
            Allocation Results
          </h1>
          <p className="text-muted mt-1">
            {totalAssigned} assigned, {totalUnassigned} unassigned
          </p>
        </div>

        {/* Actions */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={exportCsv}
            className="h-10 rounded-lg bg-secondary px-4 text-sm font-medium text-white hover:bg-secondary/80 transition-colors"
          >
            Export CSV
          </button>
          <Link
            href={`/event/${params.id}/admin/emails?token=${token}`}
            className="h-10 inline-flex items-center rounded-lg border border-border bg-surface/40 px-4 text-sm font-medium text-foreground hover:bg-surface transition-colors"
          >
            Preview Emails
          </Link>
        </div>

        {/* Results by option */}
        <div className="flex flex-col gap-4">
          {results.options.map((opt) => (
            <div
              key={opt.option_id}
              className="rounded-lg border border-border bg-surface/40"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="font-semibold text-foreground">{opt.option_name}</h2>
                <span className="text-sm text-muted">
                  {opt.assigned.length} / {opt.capacity}
                </span>
              </div>
              <div className="px-4 py-3">
                {opt.assigned.length === 0 ? (
                  <p className="text-sm text-muted">No participants assigned.</p>
                ) : (
                  <ul className="text-sm text-foreground space-y-1">
                    {opt.assigned.map((email) => (
                      <li key={email}>{email}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}

          {/* Unassigned */}
          {results.unassigned.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50/40">
              <div className="flex items-center justify-between px-4 py-3 border-b border-red-300">
                <h2 className="font-semibold text-red-800">Unassigned</h2>
                <span className="text-sm text-red-600">
                  {results.unassigned.length}
                </span>
              </div>
              <div className="px-4 py-3">
                <ul className="text-sm text-red-800 space-y-1">
                  {results.unassigned.map((email) => (
                    <li key={email}>{email}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
