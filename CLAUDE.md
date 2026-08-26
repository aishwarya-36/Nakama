```markdown
# Nakama

Splitwise-style expense splitter. Next.js 14 (App Router) + Prisma + PostgreSQL + TypeScript + Tailwind.

## Stack notes

- Auth: cookie/JWT session via `src/lib/auth.ts` (`getSessionFromCookies`)
- All authenticated pages live under `src/app/(app)/` with a shared `Sidebar` layout
- DB: Prisma, `src/lib/db.ts` exports the singleton client

## Data model invariants

- Money always flows through `GroupMember`, never directly against `User` — this lets a guest be "claimed" by a real account later without touching history
- `Contact` = a user's private address-book entry (a reusable guest identity across groups), owned by exactly one `User`
- "Direct" (no-group) expenses are backed by an implicit `Group` (`isPersonal: true`, `personalKey` = sorted contact-id signature) — found-or-created per exact participant set, hidden from the Groups list
- Multi-payer support: `Expense` has no single payer field — payers live in `ExpensePayment` (like `ExpenseSplit` but for who paid), summed and validated to equal the total
- `SplitType` enum: `EQUAL | EXACT | PERCENTAGE | SHARES`

## Migration workflow (important — non-obvious)

`prisma migrate dev` fails in this sandboxed/non-interactive environment. Working pattern used throughout:

1. Edit `schema.prisma`
2. `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$DATABASE_URL" --script`
3. Write that SQL into a new `prisma/migrations/<timestamp>_<name>/migration.sql`
4. `npx prisma db execute --file <path> --schema prisma/schema.prisma`
5. `npx prisma migrate resolve --applied <migration_name>`
6. `npx prisma generate`

For schema changes with existing data to preserve (e.g. dropping a column), split into an additive migration + backfill script + destructive migration — don't drop/rename columns with live data in one step.

## Conventions

- Shared split-math lives in `src/lib/splits.ts` (`computeSplitRows`, `validatePayers`) — don't duplicate per-route
- Toasts: `useToast()` from `src/components/ToastProvider.tsx` (wrapped at `(app)/layout.tsx`) for success/failure feedback on user actions, not inline error text
- Excel export uses `exceljs`, not the `xlsx` npm package (that one has unpatched CVEs)
- Type-check with `npx tsc --noEmit` before considering a change done — cheaper than a full `next build`
- Don't `rm -rf .next` routinely — only when the cache is actually stale/corrupted (e.g. after a route-conflict error)

## Known rough edges

- (fill in as they come up)

## TODO / in progress

- (fill in as they come up)
```

Feel free to trim or reorder — the migration-workflow section is the part most worth keeping since it's the least discoverable from the code itself.
