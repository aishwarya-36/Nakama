# Nakama

Splitwise-style expense splitter. Next.js 14 (App Router) + Prisma + PostgreSQL + TypeScript + Tailwind.

## Stack notes

- Auth: cookie/JWT session via `src/lib/auth.ts` (`getSessionFromCookies`)
- All authenticated pages live under `src/app/(app)/` with a shared `Sidebar` layout (Home, Groups, People, Expenses, History, Help, Settings — collapsible to icon-only, state in `localStorage`)
- DB: Prisma, `src/lib/db.ts` exports the singleton client

## Data model invariants

- Money always flows through `GroupMember`, never directly against `User` — this lets a guest be "claimed" by a real account later without touching history
- `Contact` = a user's private address-book entry (a reusable guest identity across groups), owned by exactly one `User`
- "Direct" (no-group) expenses are backed by an implicit `Group` (`isPersonal: true`, `personalKey` = sorted contact-id signature) — found-or-created per exact participant set, hidden from the Groups list
- Multi-payer support: `Expense` has no single payer field — payers live in `ExpensePayment` (like `ExpenseSplit` but for who paid), summed and validated to equal the total
- `SplitType` enum: `EQUAL | EXACT | PERCENTAGE | SHARES`
- `Settlement` records a payment between two `GroupMember`s (settling a debt fully/partially, or an advance) — folded into `computeGroupBalances()` automatically, nothing else needs to know it exists
- Actor stamps (`Group.createdById`, `ExpenseHistory.actorUserId`, `Settlement.recordedById`) are plain nullable `String` userId columns with **no FK** — they only feed the History/activity feed (`src/lib/activity.ts`), so referential integrity isn't needed and old pre-migration rows are simply absent from that feed

## Migration workflow (important — non-obvious)

`prisma migrate dev` fails in this sandboxed/non-interactive environment. Working pattern used throughout:

1. Edit `schema.prisma`
2. `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$DATABASE_URL" --script`
3. Write that SQL into a new `prisma/migrations/<timestamp>_<name>/migration.sql`
4. `npx prisma db execute --file <path> --schema prisma/schema.prisma`
5. `npx prisma migrate resolve --applied <migration_name>`
6. `npx prisma generate`

For schema changes with existing data to preserve (e.g. dropping a column), split into an additive migration + backfill script + destructive migration — don't drop/rename columns with live data in one step.

**The `_prisma_migrations` bookkeeping table has intermittently come back empty/missing between sessions** (root cause unconfirmed — possibly a Postgres container restart), making `prisma migrate status`/`deploy` think nothing is applied even though the schema already matches. Fix: re-run `npx prisma migrate resolve --applied <name>` for every migration folder in chronological order, then confirm with `npx prisma migrate status` → "Database schema is up to date!". Do this proactively before trusting migration state at the start of schema work if anything looks off.

## Conventions

- Shared split-math lives in `src/lib/splits.ts` (`computeSplitRows`, `validatePayers`) — don't duplicate per-route
- Toasts: `useToast()` from `src/components/ToastProvider.tsx` (wrapped at `(app)/layout.tsx`) for success/failure feedback on user actions, not inline error text
- Excel export uses `exceljs`, not the `xlsx` npm package (that one has unpatched CVEs)
- Client-side data refresh after a mutation uses plain DOM `CustomEvent`s, not a state library: `window.dispatchEvent(new Event("nakama:expenses-changed"))` after adding/editing an expense, `"nakama:settlement-changed"` after recording a payment. Any list/card that needs to stay in sync adds a `window.addEventListener` for the relevant event and re-fetches
- Client components that receive server-fetched data as initial props and then render anything locale/timezone-dependent (`toLocaleString()`, `toLocaleDateString()`) will hydration-mismatch, since Node's and the browser's locale formatting differ. Fix used throughout: don't pass pre-fetched data as props at all — start state empty/loading and fetch client-side in `useEffect` (see `RecentExpensesTable`, `ActivityList`)
- Type-check with `npx tsc --noEmit` before considering a change done — cheaper than a full `next build`
- Don't `rm -rf .next` routinely — only when the cache is actually stale/corrupted (e.g. after a route-conflict error)
- When testing against a scratch dev server on a throwaway port, kill it by the actual `next-server` process (`ss -ltnp | grep <port>`), not the `next dev`/npm wrapper PID — npm doesn't forward signals to the child it spawned, so killing the wrapper leaves the real server (and the port) alive

## Known rough edges

- (fill in as they come up)

## TODO / in progress

- (none currently)
