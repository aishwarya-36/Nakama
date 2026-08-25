# Nakama (Wisely split)

A simplified Expenses app: Next.js (App Router, API routes) + Prisma + PostgreSQL.

## What's in this version

- Email/password auth (JWT in an httpOnly cookie)
- A sidebar shell — **Home** (net balance summary + recent groups), **Groups**, **Expenses** (personal insights across every group), **Settings**
- Create a group by typing names — people don't need an account to be tracked.
- **Reusable guest identities ("contacts")**: adding "John" once creates a Contact you own. Adding people to a
  new group shows an autocomplete of your existing contacts — pick the suggestion to combine "John"'s history
  across groups, or just keep typing a fresh name to create a distinct person (even if the name matches). Two
  people are only ever the same Contact if you explicitly picked one from the list.
- Each person (guest or account) can have their own base currency, set when adding them
- Add expenses with **equal**, **exact-amount**, or **percentage** splits, in any of ~110 ISO currencies
- The balances "show in" currency picker is grounded in reality: it only offers currencies that actually
  appear in that group's expenses, plus your own base currency — never an arbitrary fixed list
- Net balances per member + simplified "who owes who" settlement suggestions (greedy min-cash-flow, per currency)
- Personal **Expenses** page: net balance, total owed to/by you, and a bar chart of your monthly spending share
  across all groups, everything converted to your base currency
- **Settings**: change email (password-confirmed), change password, set your base currency
- Light/dark theme toggle (Graphite & Indigo design tokens, Tailwind-driven)

## Not yet built (natural next steps)

- Linking a guest `GroupMember`/`Contact` to a real `User` (e.g. by email invite) once they sign up
- Recording settlements ("mark as paid") — the `Settlement` model already exists in the schema, just needs an API route + UI
- Editing/deleting expenses, and a contacts management page (rename/merge/delete)
- Real exchange rates (currently a static table in `src/lib/currency.ts` — swap `getRates()` for a live API).
  Currencies without a rate on file simply skip conversion rather than breaking anything.
- Expense categories (for richer spending insights than "total per month")

## Local setup

1. **Install PostgreSQL locally** (or run it in Docker) and create a database:

   ```bash
   createdb splitwise
   ```

2. **Copy the env file and fill it in:**

   ```bash
   cp .env.example .env
   # edit DATABASE_URL if your local Postgres user/password/port differ
   # set JWT_SECRET to any long random string
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Run the first migration** (creates all tables from `prisma/schema.prisma`):

   ```bash
   npm run db:migrate
   ```

5. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000 — it'll redirect you to `/register`, then `/home`.

Useful extras:

- `npm run db:studio` — a GUI to browse/edit your local database
- After changing `prisma/schema.prisma`, run `npm run db:migrate` again to create a new migration

## How the "no account required, but reusable" model works

Money never points directly at a `User`. It points at `GroupMember`, which is "a person in this group" and
_optionally_ has a `userId` (real account) or a `contactId` (a reusable guest identity you own):

- The group creator's `GroupMember` row is linked to their `User` automatically.
- Everyone else you add is a guest. Typing a brand-new name creates a `Contact` you own, plus a `GroupMember`
  in that group pointing at it.
- Adding a person to _another_ group shows your existing `Contact`s as autocomplete suggestions (see
  `/api/contacts` and `PersonPicker.tsx`). Picking one reuses the same `contactId` — a new `GroupMember` row is
  still created (per group), but since it's the same `Contact`, their balances and spending combine correctly
  wherever you aggregate across groups (Home, Expenses).
- Matching is **never automatic** — two contacts can share a name. You only get the "same person" behavior by
  explicitly picking the suggestion; otherwise a new name always makes a new, distinct Contact.
- A guest can be claimed by a real account later (future feature) by setting `userId` on their `GroupMember` —
  history stays intact since it was always attached to the `GroupMember`/`Contact`, not directly to a `User`.

## Project structure

```
prisma/schema.prisma          - data model (User, Contact, Group, GroupMember, Expense, ExpenseSplit, Settlement)
src/lib/db.ts                 - Prisma client singleton
src/lib/auth.ts               - password hashing, JWT sign/verify, session cookie helpers
src/lib/currencies.ts         - full ISO currency list, for dropdowns
src/lib/currency.ts           - smaller exchange-rate table + conversion (swap for a real API later)
src/lib/contacts.ts           - resolveContact(): create-or-reuse logic for guest identities
src/lib/balances.ts           - per-group balances, debt simplification, cross-group personal aggregation
src/middleware.ts             - redirects unauthenticated users away from protected pages
src/app/api/...               - REST-ish API routes (auth, user settings, contacts, groups, members, expenses, balances)
src/app/(app)/                - the authenticated shell: home, groups, groups/[id], expenses, settings
src/app/login, src/app/register - unauthenticated pages
src/components/                - Sidebar, ThemeToggle, PersonPicker, forms, charts, balances panel
```
