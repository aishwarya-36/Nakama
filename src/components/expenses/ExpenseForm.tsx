"use client";
import { useRouter } from "next/navigation";
import ExpenseTabsForm, { ExpensePayload, ExpenseHistoryEntry } from "@/components/expenses/ExpenseTabsForm";
import type { Member } from "@/lib/types";
import { apiPost, apiPatch } from "@/lib/api";

export default function ExpenseForm({
  groupId,
  expenseId,
  members,
  defaultCurrency,
  initial,
  historyEntries,
  withNames,
  onSuccess,
}: {
  groupId: string;
  expenseId?: string;
  members: Member[];
  defaultCurrency?: string;
  initial?: ExpensePayload;
  historyEntries?: ExpenseHistoryEntry[];
  withNames?: string[] | null;
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
    const result = expenseId
      ? await apiPatch(`/api/groups/${groupId}/expenses/${expenseId}`, body)
      : await apiPost(`/api/groups/${groupId}/expenses`, body);
    if (result.ok) router.refresh();
    return result;
  }

  return (
    <ExpenseTabsForm
      participants={participants}
      defaultCurrency={initial?.currency || defaultCurrency}
      initial={initial}
      historyEntries={historyEntries}
      onSubmit={handleSubmit}
      onSuccess={onSuccess}
      detailsExtra={
        withNames ? (
          <div>
            <label className="block text-sm font-medium text-text">With</label>
            <p className="mt-1 text-sm text-text-muted">
              {withNames.length > 0 ? withNames.join(", ") : "Just you"}
            </p>
          </div>
        ) : undefined
      }
    />
  );
}
