"use client";

import { useEffect, useState, useCallback } from "react";

interface InboxEmail {
  to: string;
  subject: string;
  html: string;
  code: string;
  expires_at: string;
  expired: boolean;
}

export default function DevInboxPage() {
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/inbox");
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    // Auto-refresh every 10 seconds so codes appear promptly
    const interval = setInterval(fetchEmails, 10_000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  function timeUntil(iso: string): string {
    const diff = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
    if (diff <= 0) return "expired";
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800 mb-4">
            Dev only — not visible in production
          </div>
          <h1 className="text-3xl font-bold text-primary">Dev Inbox</h1>
          <p className="text-muted mt-1">
            Simulated emails — refreshes every 10 seconds.
          </p>
        </div>

        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : emails.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface/40 p-8 text-center">
            <p className="text-muted">No emails yet. Request a verification code to see it here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {emails.map((email, i) => {
              const key = `${email.to}-${email.expires_at}`;
              const isOpen = expanded === key;
              return (
                <div
                  key={key}
                  className={`rounded-lg border bg-surface/40 ${
                    email.expired ? "border-border opacity-60" : "border-border"
                  }`}
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    {/* Unread dot */}
                    {!email.expired && (
                      <span className="flex h-2 w-2 shrink-0 rounded-full bg-accent" />
                    )}
                    {email.expired && (
                      <span className="flex h-2 w-2 shrink-0 rounded-full bg-border" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {email.to}
                      </p>
                      <p className="text-xs text-muted truncate">{email.subject}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-mono ${email.expired ? "text-muted" : "text-accent"}`}>
                        {email.expired ? "expired" : timeUntil(email.expires_at)}
                      </p>
                      <p className="text-xs text-muted">{isOpen ? "Hide" : "Open"}</p>
                    </div>
                  </button>

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
