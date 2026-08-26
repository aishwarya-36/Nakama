"use client";
import { useState } from "react";
import Modal from "./Modal";
import AddExpenseForm from "./AddExpenseForm";

type Member = { id: string; displayName: string };

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
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
      >
        + Add expense
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add an expense">
        <AddExpenseForm
          groupId={groupId}
          members={members}
          defaultCurrency={defaultCurrency}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
