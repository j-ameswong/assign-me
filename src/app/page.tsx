import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex w-full max-w-md flex-col items-center gap-8 px-6 py-16">
        <h1 className="text-5xl font-bold tracking-tight text-primary">
          AllocateMe
        </h1>
        <p className="text-center text-lg text-muted">
          First Come First Served!
        </p>

        <Link
          href="/create"
          className="flex h-12 w-full items-center justify-center rounded-lg bg-primary font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Create Event
        </Link>

        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-secondary">or join an event</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form
            action="/join"
            className="flex gap-2"
          >
            <input
              type="text"
              name="code"
              placeholder="Enter join code (e.g. PROJ-7X2K)"
              className="h-12 flex-1 rounded-lg border border-border bg-surface px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              required
            />
            <button
              type="submit"
              className="h-12 rounded-lg bg-secondary px-4 font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Join
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
