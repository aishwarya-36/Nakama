export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE";

function roundCents(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Turns a split request into per-participant amounts, validating against the
 * given set of valid participant ids. Shared by the group-expense and
 * direct (no-group) expense routes so the split math only lives once.
 */
export function computeSplitRows(
  splitType: SplitType,
  amount: number,
  validIds: Set<string>,
  allIds: string[],
  memberIds: string[] | undefined,
  splits: { id: string; value: number }[] | undefined
): { id: string; amount: number }[] | { error: string } {
  if (splitType === "EQUAL") {
    const ids = memberIds?.length ? memberIds : allIds;
    for (const id of ids) {
      if (!validIds.has(id)) return { error: "Invalid member in split" };
    }
    const share = roundCents(amount / ids.length);
    return ids.map((id, i) => ({
      id,
      amount: i === ids.length - 1 ? roundCents(amount - share * (ids.length - 1)) : share,
    }));
  }

  if (splitType === "EXACT") {
    const rows = splits || [];
    for (const s of rows) {
      if (!validIds.has(s.id)) return { error: "Invalid member in split" };
    }
    const sum = roundCents(rows.reduce((acc, s) => acc + s.value, 0));
    if (sum !== roundCents(amount)) {
      return { error: `Exact splits (${sum}) must add up to the total (${amount})` };
    }
    return rows.map((s) => ({ id: s.id, amount: roundCents(s.value) }));
  }

  // PERCENTAGE
  const rows = splits || [];
  for (const s of rows) {
    if (!validIds.has(s.id)) return { error: "Invalid member in split" };
  }
  const pctSum = roundCents(rows.reduce((acc, s) => acc + s.value, 0));
  if (pctSum !== 100) {
    return { error: `Percentages must add up to 100 (got ${pctSum})` };
  }
  return rows.map((s) => ({ id: s.id, amount: roundCents((s.value / 100) * amount) }));
}
