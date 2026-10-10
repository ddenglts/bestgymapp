This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Session integrity migration and regression tests

Set `DATABASE_URL` for your Neon database, then run `npm run db:migrate`
**before deploying** the session-integrity changes. Migration 0006 adds a
single-row constraint to `current_workout`; the app uses a transaction-scoped
advisory lock inside Neon HTTP batches to serialize session mutations.

If the migration reports `cw_singleton_unique`, the database already contains
multiple active sessions. The migration intentionally refuses to discard them.
Inspect them with:

```sql
SELECT cw.id, cw.session_id, ws.workout_id, ws.started_at, ws.completed_at
FROM current_workout cw JOIN workout_sessions ws ON ws.id = cw.session_id
ORDER BY cw.last_updated_at DESC;
```

Choose which session to keep active. For each other session, explicitly finish
it and remove its `current_workout` pointer in a transaction, preserving the
session and its sets, then rerun the migration. Do not delete `workout_sessions`
to resolve this: that would cascade to the recorded sets.

Run `npm test`, `npm run lint`, and `npx tsc --noEmit` for local checks. The
regression suite applies all migrations to an isolated in-memory PGlite database
and uses JSDOM for form interactions; it never connects to `DATABASE_URL`.
