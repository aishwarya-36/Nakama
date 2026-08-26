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

/** Field-level diff between two expense snapshots, as human-readable summary lines. */
export function diffExpense(before: ExpenseSnapshot, after: ExpenseSnapshot): string[] {
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
    changes.push("Notes updated");
  }
  if (before.date.getTime() !== after.date.getTime()) {
    changes.push(
      `Date changed from ${before.date.toISOString().slice(0, 10)} to ${after.date.toISOString().slice(0, 10)}`
    );
  }
  if (before.splitType !== after.splitType) {
    changes.push(`Split type changed from ${before.splitType} to ${after.splitType}`);
  }
  if (rowsKey(before.payments) !== rowsKey(after.payments)) {
    changes.push("Payers updated");
  }
  if (rowsKey(before.splits) !== rowsKey(after.splits)) {
    changes.push("Split updated");
  }

  return changes;
}
