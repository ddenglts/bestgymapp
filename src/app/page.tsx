import { CircleButton } from "@/components/ui/circle-button";
import { WorkoutCard } from "@/components/workout-card";

export default function Home() {
  const sampleWorkout = {
    title: "Pull Session",
    meta: "Today · 45 min",
    exercises: [
      { name: "Weighted Pull-ups", detail: "4 sets · RPE 8 · 45 lb" },
      { name: "Bent-over Rows", detail: "3 sets · 8 reps · 135 lb" },
      { name: "Cable Pulldowns", detail: "3 sets · 12 reps · 90 lb" },
    ],
  };

  return (
    <section className="flex w-full flex-1 flex-col items-center gap-10">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <CircleButton>New Workout</CircleButton>
        <CircleButton>New Exercise</CircleButton>
      </div>
      <div className="flex w-full flex-col gap-4">
        <WorkoutCard {...sampleWorkout} />
      </div>
    </section>
  );
}
