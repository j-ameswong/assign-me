import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md px-6 text-center">
        <h1 className="text-3xl font-bold text-primary mb-3">
          Submission Received!
        </h1>
        <p className="text-muted mb-8">
          Your ranked preferences have been recorded. The event host will run
          the allocation once all submissions are in.
        </p>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-6 font-medium text-foreground hover:bg-surface transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
