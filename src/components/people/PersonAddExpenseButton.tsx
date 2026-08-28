"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import AddDirectExpenseForm from "@/components/expenses/AddDirectExpenseForm";
import { emitExpensesChanged } from "@/lib/events";

export default function PersonAddExpenseButton({
  contact,
  userName,
}: {
  contact: { id: string; name: string; baseCurrency: string };
  userName: string;
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
        <AddDirectExpenseForm
          userName={userName}
          initialPeople={[{ name: contact.name, contactId: contact.id, baseCurrency: contact.baseCurrency }]}
          onSuccess={onAdded}
        />
      </Modal>
    </>
  );
}
