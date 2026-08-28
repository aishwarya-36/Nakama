export interface ExpenseSnapshot {
  description: string;
  amount: number;
  currency: string;
  category: string | null;
  notes: string | null;
  date: Date;
  splitType: string;
  payments: { groupMemberId: string; amount: number }[];
  splits: { groupMemberId: string; amount: number }[];
}

function rowsKey(rows: { groupMemberId: string; amount: number }[]) {
  return rows
    .map((r) => `${r.groupMemberId}:${r.amount.toFixed(2)}`)
    .sort()
    .join(",");
}

function truncate(s: string, max = 40) {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Per-member before/after amounts for a payments or splits row set, e.g.
 *  "Alice 10.00 → 15.00, Bob added (5.00), Carol removed (was 8.00)". */
function describeRowsChange(
  label: string,
  before: { groupMemberId: string; amount: number }[],
  after: { groupMemberId: string; amount: number }[],
  memberNames: Record<string, string>,
  currency: string
): string | null {
  if (rowsKey(before) === rowsKey(after)) return null;

  const beforeMap = new Map(before.map((r) => [r.groupMemberId, r.amount]));
  const afterMap = new Map(after.map((r) => [r.groupMemberId, r.amount]));
  const ids = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  const parts: string[] = [];
  for (const id of ids) {
    const name = memberNames[id] || "Someone";
    const b = beforeMap.get(id);
    const a = afterMap.get(id);
    if (b === undefined) parts.push(`${name} added (${a!.toFixed(2)} ${currency})`);
    else if (a === undefined) parts.push(`${name} removed (was ${b.toFixed(2)} ${currency})`);
    else if (b !== a) parts.push(`${name} ${b.toFixed(2)} → ${a.toFixed(2)} ${currency}`);
  }
  return `${label} changed: ${parts.join(", ")}`;
}

/** Field-level diff between two expense snapshots, as human-readable summary lines. */
export function diffExpense(
  before: ExpenseSnapshot,
  after: ExpenseSnapshot,
  memberNames: Record<string, string> = {}
): string[] {
  const changes: string[] = [];

  if (before.description !== after.description) {
    changes.push(`Description changed from "${before.description}" to "${after.description}"`);
  }
  if (before.amount !== after.amount || before.currency !== after.currency) {
    changes.push(
      `Amount changed from ${before.amount.toFixed(2)} ${before.currency} to ${after.amount.toFixed(2)} ${after.currency}`
    );
  }
  if ((before.category || "") !== (after.category || "")) {
    changes.push(`Category changed from "${before.category || "none"}" to "${after.category || "none"}"`);
  }
  if ((before.notes || "") !== (after.notes || "")) {
    const b = before.notes ? `"${truncate(before.notes)}"` : "none";
    const a = after.notes ? `"${truncate(after.notes)}"` : "none";
    changes.push(`Notes changed from ${b} to ${a}`);
  }
  if (before.date.getTime() !== after.date.getTime()) {
    changes.push(
      `Date changed from ${before.date.toISOString().slice(0, 10)} to ${after.date.toISOString().slice(0, 10)}`
    );
  }
  if (before.splitType !== after.splitType) {
    changes.push(`Split type changed from ${before.splitType} to ${after.splitType}`);
  }

  const payersChange = describeRowsChange("Payers", before.payments, after.payments, memberNames, after.currency);
  if (payersChange) changes.push(payersChange);

  const splitChange = describeRowsChange("Split", before.splits, after.splits, memberNames, after.currency);
  if (splitChange) changes.push(splitChange);

  return changes;
}
