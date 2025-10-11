import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { currentWorkout, workoutSessions } from "@/db/schema";
import { NavBarClient } from "./nav-bar-client";

export async function NavBar() {
  const [activeWorkout] = await db
    .select({
      workoutId: workoutSessions.workoutId,
    })
    .from(currentWorkout)
    .leftJoin(workoutSessions, eq(workoutSessions.id, currentWorkout.sessionId))
    .limit(1);

  const workoutHref =
    activeWorkout && activeWorkout.workoutId
      ? `/workout/start/${activeWorkout.workoutId}`
      : "/workout";

  const links = [
    { href: "/exercises", label: "E" },
    { href: "/", label: "W" },
    { href: "/history", label: "H" },
    { href: workoutHref, label: ">" },
  ];

  return <NavBarClient links={links} />;
}
