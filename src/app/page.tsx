import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-8 px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          AllocateMe
        </h1>
        <p className="text-center text-lg text-zinc-600 dark:text-zinc-400">
          Fair allocation of limited options among participants.
        </p>

        <Link
          href="/create"
          className="flex h-12 w-full items-center justify-center rounded-lg bg-zinc-900 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Create Event
        </Link>

        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-sm text-zinc-500">or join an event</span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <form
            action="/join"
            className="flex gap-2"
          >
            <input
              type="text"
              name="code"
              placeholder="Enter join code (e.g. PROJ-7X2K)"
              className="h-12 flex-1 rounded-lg border border-zinc-300 bg-white px-4 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-600"
              required
            />
            <button
              type="submit"
              className="h-12 rounded-lg border border-zinc-300 px-4 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Join
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
