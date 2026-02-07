"use client";

import { useState } from "react";

interface OptionRow {
  name: string;
  description: string;
  capacity: number;
}

interface CreatedEvent {
  id: string;
  join_code: string;
  admin_token: string;
  admin_url: string;
}

const emptyOption = (): OptionRow => ({ name: "", description: "", capacity: 1 });

export default function CreateEventPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emailVerification, setEmailVerification] = useState(false);
  const [options, setOptions] = useState<OptionRow[]>([emptyOption()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedEvent | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function addOption() {
    setOptions([...options, emptyOption()]);
  }

  function removeOption(index: number) {
    if (options.length <= 1) return;
    setOptions(options.filter((_, i) => i !== index));
  }

  function updateOption(index: number, field: keyof OptionRow, value: string | number) {
    setOptions(options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          email_verification: emailVerification,
          options: options.map((opt) => ({
            name: opt.name,
            description: opt.description || undefined,
            capacity: opt.capacity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create event");
        return;
      }

      setCreated(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Success view ──────────────────────────────────────────────
  if (created) {
    const fullAdminUrl = `${window.location.origin}${created.admin_url}`;
    const joinUrl = `${window.location.origin}/join/${created.join_code}`;

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md px-6 py-16">
          <h1 className="text-3xl font-bold text-primary mb-2">Event Created!</h1>
          <p className="text-muted mb-8">
            Save these details — the admin link cannot be recovered!
          </p>

          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Join Code
              </label>
              <div className="flex gap-2">
                <code className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-lg font-mono text-foreground">
                  {created.join_code}
                </code>
                <button
                  onClick={() => copyToClipboard(created.join_code, "code")}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                >
                  {copied === "code" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Join Link (for participants)
              </label>
              <div className="flex gap-2">
                <code className="flex-1 truncate rounded-lg border border-border bg-surface px-4 py-3 text-sm font-mono text-foreground">
                  {joinUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(joinUrl, "join")}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                >
                  {copied === "join" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Admin Link (save this!)
              </label>
              <div className="flex gap-2">
                <code className="flex-1 truncate rounded-lg border border-border bg-surface px-4 py-3 text-sm font-mono text-foreground">
                  {fullAdminUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(fullAdminUrl, "admin")}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
                >
                  {copied === "admin" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-muted mt-1">
                This is the only time this link will be shown.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form view ─────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-lg px-6 py-16">
        <h1 className="text-3xl font-bold text-primary mb-8">Create Event</h1>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Title */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. CS301 Project Allocation"
            className="h-12 w-full rounded-lg border border-border bg-surface px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            required
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
            Description <span className="text-muted">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instructions or context for participants"
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted focus:border-accent focus:outline-none resize-none"
          />
        </div>

        {/* Email verification toggle */}
        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={emailVerification}
            onClick={() => setEmailVerification(!emailVerification)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
              emailVerification ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                emailVerification ? "translate-x-5.5 ml-0" : "translate-x-0.5"
              }`}
            />
          </button>
          <label className="text-sm text-foreground">
            Require email verification
          </label>
        </div>

        {/* Options */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Options</h2>
            <button
              type="button"
              onClick={addOption}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-secondary hover:bg-surface transition-colors"
            >
              + Add Option
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {options.map((opt, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted">Option {i + 1}</span>
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-sm text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={opt.name}
                  onChange={(e) => updateOption(i, "name", e.target.value)}
                  placeholder="Option name"
                  className="mb-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                  required
                />
                <input
                  type="text"
                  value={opt.description}
                  onChange={(e) => updateOption(i, "description", e.target.value)}
                  placeholder="Description (optional)"
                  className="mb-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted">Capacity:</label>
                  <input
                    type="number"
                    min={1}
                    value={opt.capacity}
                    onChange={(e) => updateOption(i, "capacity", parseInt(e.target.value) || 1)}
                    className="h-10 w-20 rounded-lg border border-border bg-surface px-3 text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-lg bg-primary font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Event"}
        </button>
      </form>
    </div>
  );
}
