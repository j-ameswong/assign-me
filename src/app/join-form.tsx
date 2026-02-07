"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinForm() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed) {
      router.push(`/join/${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter join code (e.g. PROJ-7X2K)"
        className="h-12 flex-1 rounded-lg border border-border bg-surface px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        required
      />
      <button
        type="submit"
        className="h-12 rounded-lg bg-primary px-4 font-medium text-white transition-colors hover:bg-primary-hover"
      >
        Join
      </button>
    </form>
  );
}
