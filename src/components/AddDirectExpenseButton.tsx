"use client";
import { useState } from "react";
import Modal from "./Modal";
import AddDirectExpenseForm from "./AddDirectExpenseForm";

export default function AddDirectExpenseButton({ userName }: { userName: string }) {
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
        <AddDirectExpenseForm userName={userName} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
