export type ExerciseCardData = {
  id: number;
  name: string;
  createdAt: Date;
};

type ExerciseCardProps = ExerciseCardData;

export function ExerciseCard({
  name,
  createdAt,
}: ExerciseCardProps) {
  const addedOn = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(createdAt);

  return (
    <article className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.55)] backdrop-blur transition hover:border-white/20 hover:bg-white/[0.06]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-white">{name}</h2>
        <span className="text-xs uppercase tracking-[0.2em] text-white/40">
          Added {addedOn}
        </span>
      </div>
    </article>
  );
}
