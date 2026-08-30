"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import AddDirectExpenseForm from "@/components/expenses/AddDirectExpenseForm";
import { emitExpensesChanged } from "@/lib/events";

export default function PersonAddExpenseButton({
  person,
  userName,
}: {
  person: { id: string; name: string; baseCurrency: string; email: string | null; kind: "contact" | "user" };
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
          initialPeople={[
            person.kind === "user"
              ? { name: person.name, email: person.email || undefined, baseCurrency: person.baseCurrency }
              : { name: person.name, contactId: person.id, baseCurrency: person.baseCurrency },
          ]}
          onSuccess={onAdded}
        />
      </Modal>
    </>
  );
}
