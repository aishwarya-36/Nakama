"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import AddMySpendForm from "@/components/expenses/AddMySpendForm";
import DeleteExpenseButton from "@/components/expenses/DeleteExpenseButton";
import { ExpensePayload, ExpenseHistoryEntry } from "@/components/expenses/ExpenseTabsForm";
import type { Member } from "@/lib/types";

interface ExpenseDetail {
  description: string;
  amount: string | number;
  currency: string;
  category: string | null;
  notes: string | null;
  date: string;
  deletedAt: string | null;
  payments: { groupMemberId: string; amount: string | number }[];
  splits: { groupMemberId: string; amount: string | number }[];
  history: { summary: string; changedBy: string; createdAt: string }[];
}

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
  const [withNames, setWithNames] = useState<string[] | null>(null);
  const [soloSpend, setSoloSpend] = useState<{ selfMemberId: string } | null>(null);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (!open || !groupId || !expenseId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setInitial(null);
    fetch(`/api/groups/${groupId}/expenses/${expenseId}`)
      .then((r) => r.json())
      .then(
        (data: {
          expense?: ExpenseDetail;
          members?: Member[];
          group?: { isPersonal: boolean; name: string } | null;
          selfMemberId?: string;
          error?: string;
        }) => {
        if (cancelled) return;
        if (!data.expense) {
          setError(data.error || "Couldn't load expense");
          return;
        }
        const exp = data.expense;
        const groupMembers = data.members || [];
        setMembers(groupMembers);
        setWithNames(
          data.group?.isPersonal ? groupMembers.filter((m) => m.id !== data.selfMemberId).map((m) => m.displayName) : null
        );
        // A "my spend" — a personal-group expense with no one else on it — was
        // created with the lightweight solo form and should be edited with it
        // too, not the multi-tab group-expense form (see AddMySpendForm).
        setSoloSpend(
          data.group?.isPersonal && groupMembers.length === 1 && data.selfMemberId
            ? { selfMemberId: data.selfMemberId }
            : null
        );
        setInitial({
          description: exp.description,
          amount: Number(exp.amount),
          currency: exp.currency,
          category: exp.category || "",
          notes: exp.notes || "",
          date: exp.date.slice(0, 10),
          splitType: "EXACT", // stored splits are always resolved dollar amounts
          payers: exp.payments.map((p) => ({ ref: p.groupMemberId, value: Number(p.amount) })),
          splits: exp.splits.map((s) => ({ ref: s.groupMemberId, value: Number(s.amount) })),
        });
        setHistoryEntries(
          exp.history.map((h) => ({ summary: h.summary, changedBy: h.changedBy, createdAt: h.createdAt }))
        );
        setDeleted(!!exp.deletedAt);
        }
      )
      .catch(() => !cancelled && setError("Couldn't load expense"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, groupId, expenseId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit expense"
      headerActions={
        !loading && !error && !deleted ? (
          <DeleteExpenseButton
            groupId={groupId}
            expenseId={expenseId}
            onDeleted={() => {
              onSaved?.();
              onClose();
            }}
          />
        ) : undefined
      }
    >
      {loading && <p className="py-4 text-center text-sm text-text-faint">Loading…</p>}
      {!loading && error && <p className="py-4 text-center text-sm text-error">{error}</p>}
      {!loading && !error && initial && soloSpend && (
        <AddMySpendForm
          editing={{
            groupId,
            expenseId,
            selfMemberId: soloSpend.selfMemberId,
            initial: {
              description: initial.description,
              amount: initial.amount,
              currency: initial.currency,
              category: initial.category,
              notes: initial.notes,
              date: initial.date,
            },
          }}
          onSuccess={() => {
            onSaved?.();
            onClose();
          }}
        />
      )}
      {!loading && !error && initial && !soloSpend && (
        <ExpenseForm
          groupId={groupId}
          expenseId={expenseId}
          members={members}
          initial={initial}
          historyEntries={historyEntries}
          withNames={withNames}
          onSuccess={() => {
            onSaved?.();
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
