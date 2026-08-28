import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the difference between a group expense and a direct expense?",
    a: "A group expense belongs to a group you've created on the Groups tab, split among its members. A direct expense skips creating a group entirely — use \"+ Add expense\" on Home or the Expenses tab, pick who it's with, and Nakama finds or creates a private expense thread for that exact set of people behind the scenes.",
  },
  {
    q: "Who are \"People\" and how are they different from a group's members?",
    a: "People is your personal address book — contacts you can reuse across any group or direct expense without re-typing their name each time. Add someone once on the People tab (or inline while adding an expense) and they're available everywhere after that. A person can only be removed if they have no outstanding balance with you.",
  },
  {
    q: "Can more than one person pay for the same expense?",
    a: "Yes. The \"Paid by\" tab in the Add Expense form lets you add multiple payers and how much each one put in — it's validated to add up to the total before you can save.",
  },
  {
    q: "What ways can I split an expense?",
    a: "Equally among selected people, by exact amount per person, by percentage, or by shares (e.g. 2 shares for one person, 1 for another). Pick the split type on the Split tab of the Add Expense form.",
  },
  {
    q: "What are categories, notes, and the date field for?",
    a: "Category and notes are optional — category buckets your spending (Food, Travel, etc.) for the monthly chart, notes are free text for anything worth remembering. The date field is the expense's invoice date (defaults to today) rather than when you happened to enter it, so backdating a purchase doesn't skew the wrong month.",
  },
  {
    q: "Where do I see my recent spending, and can I filter or export it?",
    a: "The Home and Expenses tabs both show a recent spending table. Filter by date range (past week/month/3 months/6 months/year), search by description, and — on the Expenses tab — filter by whether you owe or are owed. Use \"Download as Excel\" to export the current filtered view.",
  },
  {
    q: "What do \"Net balance\", \"Owed to you\", and \"You owe\" mean?",
    a: "These are converted into your base currency (set on Settings) so everything nets into one number. If you have balances in other currencies, a small breakdown appears underneath each figure — click \"+N more\" if there are more than two.",
  },
  {
    q: "Can I edit an expense after adding it, and will anyone know what changed?",
    a: "Yes — click any expense in a recent spending table or a group's expense list to edit it. Every change (amount, split, payers, etc.) is logged in that expense's History tab with exactly what changed and who changed it.",
  },
  {
    q: "How do I know who should pay whom in a group?",
    a: "Open a group and check its Summary section — it lists who owes whom and how much, and its Balances panel below shows each member's full running balance.",
  },
  {
    q: "What is \"Simplify debts\" and how do I turn it on?",
    a: "By default a group shows every pairwise debt as-is (if A owes B and B owes C, both show separately). Turning on \"Simplify debts\" nets those down to the fewest transactions overall (so A just owes C directly) instead of every individual pair. Enable it from that group's Settings button, next to the group name — it's a per-group toggle, off by default.",
  },
];

export default function HelpPage() {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold text-text">Help</h1>
      <p className="mb-6 text-sm text-text-muted">
        Nakama is an expense splitter: track shared spending in groups, split bills any way that's fair, and
        see at a glance who owes whom — across as many currencies as your circle spends in.
      </p>

      <h2 className="mb-3 text-lg font-medium text-text">Frequently asked questions</h2>
      <div className="space-y-2">
        {FAQS.map((item) => (
          <details key={item.q} className="group rounded-lg border border-border bg-surface p-4 shadow-sm">
            <summary className="cursor-pointer list-none text-sm font-medium text-text marker:content-none">
              <span className="flex items-center justify-between gap-3">
                {item.q}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0 text-text-faint transition-transform group-open:rotate-180"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </summary>
            <p className="mt-2 text-sm text-text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
