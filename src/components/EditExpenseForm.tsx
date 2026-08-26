"use client";
import { useRouter } from "next/navigation";
import ExpenseTabsForm, { ExpensePayload, ExpenseHistoryEntry } from "./ExpenseTabsForm";

type Member = { id: string; displayName: string };

export default function EditExpenseForm({
  groupId,
  expenseId,
  members,
  initial,
  historyEntries,
  onSuccess,
}: {
  groupId: string;
  expenseId: string;
  members: Member[];
  initial: ExpensePayload;
  historyEntries: ExpenseHistoryEntry[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const participants = members.map((m) => ({ ref: m.id, label: m.displayName }));

  async function handleSubmit(payload: ExpensePayload) {
    const body = {
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency,
      category: payload.category || undefined,
      notes: payload.notes || undefined,
      date: payload.date,
      splitType: payload.splitType,
      payers: payload.payers.map((p) => ({ groupMemberId: p.ref, value: p.value })),
      memberIds: payload.memberIds,
      splits: payload.splits?.map((s) => ({ groupMemberId: s.ref, value: s.value })),
    };
    const res = await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error };
    }
    router.refresh();
    return { ok: true };
  }

  return (
    <ExpenseTabsForm
      participants={participants}
      defaultCurrency={initial.currency}
      initial={initial}
      historyEntries={historyEntries}
      onSubmit={handleSubmit}
      onSuccess={onSuccess}
    />
  );
}
