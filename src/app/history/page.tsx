export const dynamic = "force-dynamic";

export default function HistoryPage() {
  return (
    <section className="flex w-full flex-1 flex-col items-center px-3 py-2">
      <div className="flex w-full flex-col gap-3">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            History
          </h1>
          <p className="text-sm text-white/60">
            Review past sessions and track how you are progressing.
          </p>
        </header>
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.04] px-4 py-6 text-center text-sm text-white/60">
          Workout history will appear here once you log a session.
        </div>
      </div>
    </section>
  );
}
