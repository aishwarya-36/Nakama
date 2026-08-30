"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import DeleteExpenseButton from "@/components/expenses/DeleteExpenseButton";
import { ExpensePayload, ExpenseHistoryEntry } from "@/components/expenses/ExpenseTabsForm";
import type { Member } from "@/lib/types";

export default function ExpenseListItem({
  groupId,
  expenseId,
  members,
  description,
  paidByLabel,
  dateLabel,
  category,
  amount,
  currency,
  initial,
  historyEntries,
  contextLabel,
  deletedAt,
}: {
  groupId: string;
  expenseId: string;
  members: Member[];
  description: string;
  paidByLabel: string;
  dateLabel: string;
  category: string | null;
  amount: number;
  currency: string;
  initial: ExpensePayload;
  historyEntries: ExpenseHistoryEntry[];
  contextLabel?: string;
  deletedAt?: string | Date | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isDeleted = !!deletedAt;

  if (isDeleted) {
    return (
      <div className="-mx-2 flex w-full items-center justify-between px-2 py-3 opacity-60">
        <div>
          {contextLabel && <div className="text-xs font-medium text-primary">{contextLabel}</div>}
          <div className="font-medium text-text line-through">{description}</div>
          <div className="text-sm text-text-muted line-through">
            Paid by {paidByLabel} · {dateLabel}
            {category && ` · ${category}`}
          </div>
        </div>
        <div className="font-medium text-text line-through">
          {amount.toFixed(2)} {currency}
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-mx-2 flex w-full items-center justify-between rounded-md px-2 py-3 text-left hover:bg-surface-secondary"
      >
        <div>
          {contextLabel && <div className="text-xs font-medium text-primary">{contextLabel}</div>}
          <div className="font-medium text-text">{description}</div>
          <div className="text-sm text-text-muted">
            Paid by {paidByLabel} · {dateLabel}
            {category && ` · ${category}`}
          </div>
        </div>
        <div className="font-medium text-text">
          {amount.toFixed(2)} {currency}
        </div>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit expense"
        headerActions={
          <DeleteExpenseButton
            groupId={groupId}
            expenseId={expenseId}
            onDeleted={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        }
      >
        <ExpenseForm
          groupId={groupId}
          expenseId={expenseId}
          members={members}
          initial={initial}
          historyEntries={historyEntries}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
