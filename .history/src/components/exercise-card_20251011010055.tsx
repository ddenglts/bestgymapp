export type ExerciseSetSummary = {
  id: number;
  setNumber: number;
  reps: number | null;
  weight: number | null;
};

export type ExerciseCardData = {
  id: number;
  name: string;
  recentSets: ExerciseSetSummary[];
};

type ExerciseCardProps = ExerciseCardData;

const formatWeight = (value: number | null) => {
  if (value === null) {
    return "";
  }

  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return "";
  }

  return Number.isInteger(normalized) ? `${normalized}` : normalized.toFixed(1);
};

export function ExerciseCard({ name, recentSets }: ExerciseCardProps) {
  return (
    <article className="w-full rounded-3xl border border-white/12 bg-white/[0.05] p-4 shadow-[0_18px_36px_-22px_rgba(0,0,0,0.55)] backdrop-blur transition hover:border-white/20 hover:bg-white/[0.07]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-white">{name}</h2>
        {recentSets.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            {recentSets.map((set) => {
              const weightText = formatWeight(set.weight);
              return (
                <div
                  key={set.id}
                  className="rounded-lg border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white/80 shadow-[0_10px_20px_-16px_rgba(0,0,0,0.55)]"
                >
                  <span className="tracking-tight">
                    {set.reps ?? "—"}
                    {weightText ? `@${weightText}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-xs uppercase tracking-[0.25em] text-white/35">
            No sessions yet
          </span>
        )}
      </div>
    </article>
  );
}
