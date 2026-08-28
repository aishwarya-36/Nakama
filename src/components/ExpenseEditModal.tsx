"use client";
import { useEffect, useState } from "react";
import Modal from "./Modal";
import EditExpenseForm from "./EditExpenseForm";
import { ExpensePayload, ExpenseHistoryEntry } from "./ExpenseTabsForm";

type Member = { id: string; displayName: string };

interface ExpenseDetail {
  description: string;
  amount: string | number;
  currency: string;
  category: string | null;
  notes: string | null;
  date: string;
  payments: { groupMemberId: string; amount: string | number }[];
  splits: { groupMemberId: string; amount: string | number }[];
  history: { summary: string; changedBy: string; createdAt: string }[];
}

// Fetches the expense on open rather than requiring the caller to have it
// preloaded — for callers like the cross-group "recent spending" table that
// only have the summarized row, not the full splits/payments/history.
export default function ExpenseEditModal({
  groupId,
  expenseId,
  open,
  onClose,
  onSaved,
}: {
  groupId: string;
  expenseId: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [initial, setInitial] = useState<ExpensePayload | null>(null);
  const [historyEntries, setHistoryEntries] = useState<ExpenseHistoryEntry[]>([]);

  useEffect(() => {
    if (!open || !groupId || !expenseId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setInitial(null);
    fetch(`/api/groups/${groupId}/expenses/${expenseId}`)
      .then((r) => r.json())
      .then((data: { expense?: ExpenseDetail; members?: Member[]; error?: string }) => {
        if (cancelled) return;
        if (!data.expense) {
          setError(data.error || "Couldn't load expense");
          return;
        }
        const exp = data.expense;
        setMembers(data.members || []);
        setInitial({
          description: exp.description,
          amount: Number(exp.amount),
          currency: exp.currency,
          category: exp.category || "",
          notes: exp.notes || "",
          date: exp.date.slice(0, 10),
          // Stored splits are always resolved dollar amounts regardless of the
          // original split type, so editing always starts from exact figures.
          splitType: "EXACT",
          payers: exp.payments.map((p) => ({ ref: p.groupMemberId, value: Number(p.amount) })),
          splits: exp.splits.map((s) => ({ ref: s.groupMemberId, value: Number(s.amount) })),
        });
        setHistoryEntries(
          exp.history.map((h) => ({ summary: h.summary, changedBy: h.changedBy, createdAt: h.createdAt }))
        );
      })
      .catch(() => !cancelled && setError("Couldn't load expense"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, groupId, expenseId]);

  return (
    <Modal open={open} onClose={onClose} title="Edit expense">
      {loading && <p className="py-4 text-center text-sm text-text-faint">Loading…</p>}
      {!loading && error && <p className="py-4 text-center text-sm text-error">{error}</p>}
      {!loading && !error && initial && (
        <EditExpenseForm
          groupId={groupId}
          expenseId={expenseId}
          members={members}
          initial={initial}
          historyEntries={historyEntries}
          onSuccess={() => {
            onSaved?.();
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
