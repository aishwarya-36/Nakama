# Nakama

Expense splitter for groups and friends. Next.js 14 (App Router) + Prisma + TypeScript + Tailwind. Two runtime modes, see "Online/offline dual mode" below.

## Stack notes

- Auth: cookie/JWT session via `src/lib/auth.ts` (`getSessionFromCookies`)
- All authenticated pages live under `src/app/(app)/` with a shared `Sidebar` layout (Home, Groups, People, Expenses, History, Help, Settings — collapsible to icon-only, state in `localStorage`)
- DB: Prisma, `src/lib/db.ts` exports the singleton client — resolved at module load to either the online (Postgres) or offline (SQLite) generated client based on `getAppMode()` (`src/lib/appMode.ts`)

## Online/offline dual mode (in progress)

Two independent Prisma schemas, kept field-for-field aligned by hand (Prisma can't target two datasources from one schema):

- `prisma/online/schema.prisma` — Postgres, the schema the web app and today's cloud accounts use. Migrations in `prisma/online/migrations`.
- `prisma/offline/schema.prisma` — SQLite, for a future Electron-packaged desktop mode: no cloud account, a single local `User` ("You") gated by a PIN instead of signup, everyone else is necessarily a guest `Contact`. Migrations in `prisma/offline/migrations`.
- Because SQLite has no native enum or `Json` column type, `Expense.splitType` is a plain `String` (app already used its own string-union type, see `SplitType` below) and `ExchangeRateSnapshot.rates` is JSON-encoded `String` (see `src/lib/currency.ts` `JSON.stringify`/`JSON.parse`) in **both** schemas, kept identical on purpose so the two generated Prisma Client types stay structurally compatible.
- `src/lib/db.ts` casts the offline client to the online client's TS type — safe only because the schemas are kept aligned; don't let them drift.
- `getAppMode()` reads `NAKAMA_MODE` env var (web deployments hardcode `online` at build time). The Electron shell (not yet built) will set this from a locked local mode file instead.
- Full plan: `/home/aishu/.claude/plans/typed-napping-platypus.md`.

## Data model invariants

- Money always flows through `GroupMember`, never directly against `User` — this lets a guest be "claimed" by a real account later without touching history
- `Contact` = a user's private address-book entry (a reusable guest identity across groups), owned by exactly one `User`
- "Direct" (no-group) expenses are backed by an implicit `Group` (`isPersonal: true`, `personalKey` = sorted contact-id signature) — found-or-created per exact participant set, hidden from the Groups list
- Multi-payer support: `Expense` has no single payer field — payers live in `ExpensePayment` (like `ExpenseSplit` but for who paid), summed and validated to equal the total
- `Expense.splitType` is a plain `String` (`EQUAL | EXACT | PERCENTAGE | SHARES`, see `src/lib/splits.ts`'s `SplitType` type) — not a Prisma enum, so it works on both the online (Postgres) and offline (SQLite) schemas
- `Settlement` records a payment between two `GroupMember`s (settling a debt fully/partially, or an advance) — folded into `computeGroupBalances()` automatically, nothing else needs to know it exists
- Actor stamps (`Group.createdById`, `ExpenseHistory.actorUserId`, `Settlement.recordedById`) are plain nullable `String` userId columns with **no FK** — they only feed the History/activity feed (`src/lib/activity.ts`), so referential integrity isn't needed and old pre-migration rows are simply absent from that feed

## Migration workflow (important — non-obvious)

`prisma migrate dev` fails in this sandboxed/non-interactive environment. Working pattern used throughout (substitute `online`/`offline` for whichever schema you're changing — apply to both if the change touches shared fields):

1. Edit `prisma/online/schema.prisma` (and the matching fields in `prisma/offline/schema.prisma` if the change is shared — see "Online/offline dual mode" above)
2. `npx prisma migrate diff --from-migrations prisma/online/migrations --to-schema-datamodel prisma/online/schema.prisma --shadow-database-url "$DATABASE_URL" --script`
3. Write that SQL into a new `prisma/online/migrations/<timestamp>_<name>/migration.sql`
4. `npx prisma db execute --file <path> --schema prisma/online/schema.prisma`
5. `npx prisma migrate resolve --applied <migration_name> --schema prisma/online/schema.prisma`
6. `npm run db:generate` (regenerates both clients)

Offline (SQLite) side is the same shape, pointed at `prisma/offline/schema.prisma` / `prisma/offline/migrations`, using `OFFLINE_DATABASE_URL` — no shadow database needed since SQLite diffs `--from-empty` or from its own migrations dir directly.

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

- Prisma's `mode: "insensitive"` string filter is Postgres-only and throws under SQLite — any new case-insensitive name/description query must go through `src/lib/db-compat.ts` (`ciContains`, `findContactByNameCI`) instead of passing `mode: "insensitive"` directly, or it'll work online and 500 in offline mode
- `ExchangeRateSnapshot` needs network access to refresh (frankfurter.dev) — offline mode has no connectivity, so it only ever has the static fallback table in `src/lib/currency.ts`
- The "claim a guest later" path (`GroupMember.contactId` → later linked to a real `userId`) has no meaning in offline mode, since only one real `User` can ever exist there — not a bug, just always a no-op offline

## TODO / in progress

- Online/offline dual mode (see above). M1–M4 done, M5 (Electron shell) built and producing a working `release/win-unpacked/Nakama.exe`. Remaining: install `wine` on this Linux dev machine to let electron-builder produce the single-file NSIS installer (`npm run electron:build` currently fails only at that last signing step); real Windows testing; M6 polish (icon, uninstall/data-reset story). Plan: `/home/aishu/.claude/plans/typed-napping-platypus.md`
- Electron: `electron/main.js` spawns the Next standalone server (`next.config.js` `output: "standalone"`) in offline mode against a per-user SQLite file seeded from `electron/resources/nakama-offline-template.db` (a pre-migrated empty DB — no migration engine runs at runtime); `/mode-select` calls `window.nakama.chooseMode()` (exposed by `electron/preload.js`) to write the locked mode file and, for "online", point the window at `NAKAMA_ONLINE_URL` instead of the local server. Build locally with `npm run electron:build` (needs `wine` installed on Linux for the NSIS installer step — without it you still get a working `release/win-unpacked/`, just not a single installer exe). Iterate on the UI with `npm run electron:dev` (points the Electron window at the ordinary `next dev` server on :3000, not the packaged offline server).
- Release automation: `.github/workflows/release.yml` builds the Windows installer on a real `windows-latest` runner (sidesteps the wine requirement entirely) and attaches it as a **draft** GitHub Release whenever a `v*.*.*` tag is pushed — bump `version` in `package.json` to match before tagging. Draft on purpose, so a bad build never goes live unreviewed; publish it from the GitHub UI when it looks right. `workflow_dispatch` triggers the same build without publishing (uploads the exe as a workflow artifact instead), for testing the pipeline itself.
