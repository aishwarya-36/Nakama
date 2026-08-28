"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import { emitExpensesChanged } from "@/lib/events";
import type { Member } from "@/lib/types";

export default function AddGroupExpenseButton({
  groupId,
  members,
  defaultCurrency,
}: {
  groupId: string;
  members: Member[];
  defaultCurrency?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function onAdded() {
    setOpen(false);
    emitExpensesChanged();
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
      >
        + Add expense
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add an expense">
        <ExpenseForm
          groupId={groupId}
          members={members}
          defaultCurrency={defaultCurrency}
          onSuccess={onAdded}
        />
      </Modal>
    </>
  );
}
