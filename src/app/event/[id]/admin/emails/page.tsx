"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

interface EmailPreview {
  to: string;
  subject: string;
  html: string;
  assigned: boolean;
}

export default function EmailPreviewPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [emails, setEmails] = useState<EmailPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    if (!token) {
      setError("No admin token provided.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/events/${params.id}/emails`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to load email previews.");
        return;
      }

      const data = await res.json();
      setEmails(data.emails);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [params.id, token]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading email previews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md px-6 text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Error</h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  const assigned = emails.filter((e) => e.assigned);
  const unassigned = emails.filter((e) => !e.assigned);

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/event/${params.id}/admin/results?token=${token}`}
            className="text-sm text-accent hover:text-accent-hover transition-colors"
          >
            &larr; Back to results
          </Link>
          <h1 className="text-3xl font-bold text-primary mt-2">Email Previews</h1>
          <p className="text-muted mt-1">
            {emails.length} email{emails.length !== 1 ? "s" : ""} &mdash;{" "}
            {assigned.length} assigned, {unassigned.length} unassigned
          </p>
        </div>

        {emails.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface/40 p-8 text-center">
            <p className="text-muted">No emails to display.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {emails.map((email) => {
              const isOpen = expanded === email.to;
              return (
                <div
                  key={email.to}
                  className={`rounded-lg border bg-surface/40 ${
                    email.assigned ? "border-border" : "border-red-300"
                  }`}
                >
                  {/* Row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : email.to)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    {/* Assigned indicator */}
                    <span
                      className={`flex h-2 w-2 shrink-0 rounded-full ${
                        email.assigned ? "bg-green-500" : "bg-red-400"
                      }`}
                    />

                    {/* To + subject */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {email.to}
                      </p>
                      <p className="text-xs text-muted truncate">{email.subject}</p>
                    </div>

                    {/* Toggle */}
                    <span className="text-xs text-accent shrink-0">
                      {isOpen ? "Hide" : "Preview"}
                    </span>
                  </button>

                  {/* Expanded email body */}
                  {isOpen && (
                    <div className="border-t border-border px-4 py-4">
                      <div className="mb-3 flex flex-col gap-1 text-xs text-muted">
                        <span>
                          <span className="font-semibold text-foreground">To:</span>{" "}
                          {email.to}
                        </span>
                        <span>
                          <span className="font-semibold text-foreground">Subject:</span>{" "}
                          {email.subject}
                        </span>
                      </div>
                      <div
                        className="rounded bg-white border border-border p-4 text-sm text-gray-800"
                        dangerouslySetInnerHTML={{ __html: email.html }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
