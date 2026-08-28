export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

function roundCents(n: number) {
  return Math.round(n * 100) / 100;
}

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

  if (splitType === "SHARES") {
    const rows = splits || [];
    for (const s of rows) {
      if (!validIds.has(s.id)) return { error: "Invalid member in split" };
    }
    const totalShares = rows.reduce((acc, s) => acc + s.value, 0);
    if (totalShares <= 0) {
      return { error: "Shares must add up to more than 0" };
    }
    let remaining = roundCents(amount);
    return rows.map((s, i) => {
      if (i === rows.length - 1) return { id: s.id, amount: remaining };
      const share = roundCents((s.value / totalShares) * amount);
      remaining = roundCents(remaining - share);
      return { id: s.id, amount: share };
    });
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

export function validatePayers(
  payers: { id: string; value: number }[],
  amount: number,
  validIds: Set<string>
): { id: string; amount: number }[] | { error: string } {
  if (payers.length === 0) return { error: "Add at least one payer" };
  for (const p of payers) {
    if (!validIds.has(p.id)) return { error: "Invalid payer" };
    if (p.value <= 0) return { error: "Each payer must have paid more than 0" };
  }
  const sum = roundCents(payers.reduce((acc, p) => acc + p.value, 0));
  if (sum !== roundCents(amount)) {
    return { error: `Payments (${sum}) must add up to the total (${amount})` };
  }
  return payers.map((p) => ({ id: p.id, amount: roundCents(p.value) }));
}
