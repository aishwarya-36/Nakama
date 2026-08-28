# Nakama (Wisely split)

A simplified Expenses app: Next.js (App Router, API routes) + Prisma + PostgreSQL.

## What's in this version

- Email/password auth (JWT in an httpOnly cookie)
- A sidebar shell — **Home**, **Groups**, **People**, **Expenses**, **History**, **Help**, **Settings** —
  collapsible to icon-only (persisted in `localStorage`, auto-collapses on small screens)
- Create a group by typing names — people don't need an account to be tracked
- **People**: a personal address book of reusable guest contacts. Click a person to see every expense they're
  part of across every group and direct thread. A person can only be removed once their balance is zero
- **Direct (no-group) expenses**: add an expense with one or more people without creating a group first — the
  "With" field can also bulk-add everyone from an existing group. Backed by an implicit, hidden group per exact
  participant set, found-or-created automatically
- **Reusable guest identities ("contacts")**: adding "John" once creates a Contact you own. Adding people to a
  new group or direct expense shows an autocomplete of your existing contacts — pick the suggestion to combine
  "John"'s history across groups, or just keep typing a fresh name to create a distinct person (even if the name
  matches). Two people are only ever the same Contact if you explicitly picked one from the list
- Each person (guest or account) can have their own base currency, set when adding them
- **Add Expense** is a 3-tab form (Details / Paid by / Split):
  - Details: description, amount + currency, participants ("With"), optional notes, invoice date (defaults to
    today, independent of when it was entered), and a category with icons (or a free-text "Other")
  - Paid by: **multiple payers** on one expense, validated to add up to the total
  - Split: **equal, exact-amount, percentage, or shares**, in any of ~110 ISO currencies
- Editing an expense keeps a full **change history** (old → new values, per field, including per-person amounts
  for payer/split changes) visible in that expense's History tab
- Recent-spending tables (Home and Expenses tabs): date-range filter (week/month/3mo/6mo/year), an owed/owe
  filter, search, pagination, and an Excel export of the current filtered view
- Per-group **Balance cards** ("You owe" / "You are owed") plus two ways to record a payment: **Settle up**
  (pick a suggested debt, optionally for less than the full amount) or **Add payment** (a free-form payment
  between any two members — an advance or against an existing debt)
- Net balances per member + simplified "who owes who" settlement suggestions (greedy min-cash-flow, per
  currency), togglable per group between showing every pairwise debt or the fewest transactions overall
- Personal **Expenses** page: net balance, total owed to/by you, and a bar chart of your monthly spending share
  (by category) across all groups, everything converted to your base currency
- **History**: a paginated, chronological feed of everything you've personally done — groups created, expenses
  added/edited, payments recorded — each entry links to the relevant group or person
- **Help**: an about blurb and FAQ covering the app's features
- **Settings**: change email (password-confirmed), change password, set your base currency
- The balances "show in" currency picker is grounded in reality: it only offers currencies that actually
  appear in that group's expenses, plus your own base currency — never an arbitrary fixed list
- Light/dark theme toggle (Graphite & Indigo design tokens, Tailwind-driven)

## Not yet built (natural next steps)

- Linking a guest `GroupMember`/`Contact` to a real `User` (e.g. by email invite) once they sign up
- A contacts management page beyond the current rename/edit (merge, bulk actions)
- Real exchange rates (currently a static table in `src/lib/currency.ts` — swap `getRates()` for a live API).
  Currencies without a rate on file simply skip conversion rather than breaking anything
- Automated tests (this project has been driven entirely by manual/scripted verification so far)

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
- Adding a person to _another_ group (or a direct expense) shows your existing `Contact`s as autocomplete
  suggestions (see `/api/contacts` and `PersonPicker.tsx`). Picking one reuses the same `contactId` — a new
  `GroupMember` row is still created (per group), but since it's the same `Contact`, their balances and
  spending combine correctly wherever you aggregate across groups (Home, Expenses, that person's own page).
- Matching is **never automatic** — two contacts can share a name. You only get the "same person" behavior by
  explicitly picking the suggestion; otherwise a new name always makes a new, distinct Contact.
- A guest can be claimed by a real account later (future feature) by setting `userId` on their `GroupMember` —
  history stays intact since it was always attached to the `GroupMember`/`Contact`, not directly to a `User`.
- A payment between two members (settling a debt, in full or in part, or an advance) is a `Settlement` row —
  also attached to `GroupMember`, not `User`, for the same reason.

## Project structure

```
prisma/schema.prisma          - data model (User, Contact, Group, GroupMember, Expense, ExpenseSplit,
                                 ExpensePayment, ExpenseHistory, Settlement)
src/lib/db.ts                 - Prisma client singleton
src/lib/auth.ts               - password hashing, JWT sign/verify, session cookie helpers
src/lib/currencies.ts         - full ISO currency list, for dropdowns
src/lib/currency.ts           - smaller exchange-rate table + conversion (swap for a real API later)
src/lib/contacts.ts           - resolveContact(): create-or-reuse logic for guest identities
src/lib/splits.ts             - computeSplitRows()/validatePayers(): shared split & multi-payer math
src/lib/balances.ts           - per-group balances, debt simplification, cross-group personal aggregation
src/lib/people.ts             - a contact's balance + every expense they're part of
src/lib/userExpenses.ts       - a user's cross-group expense list (recent-spending tables), paginated/filtered
src/lib/expenseHistory.ts     - diffExpense(): field-level before/after summaries for the audit trail
src/lib/activity.ts           - getUserActivity(): combined, paginated feed for the History tab
src/middleware.ts             - redirects unauthenticated users away from protected pages
src/app/api/...               - REST-ish API routes (auth, user settings, contacts, people, groups, members,
                                 expenses, balances, settlements, activity)
src/app/(app)/                - the authenticated shell: home, groups, groups/[id], people, people/[id],
                                 expenses, history, help, settings
src/app/login, src/app/register - unauthenticated pages
src/components/                - Sidebar, Logo, ThemeToggle, PersonPicker, expense forms, charts, balances
                                 panel, GroupBalanceCards (settle up / add payment), ActivityList
```
