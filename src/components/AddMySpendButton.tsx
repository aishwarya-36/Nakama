"use client";
import { useState } from "react";
import Modal from "./Modal";
import AddMySpendForm from "./AddMySpendForm";

export default function AddMySpendButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:border-border-strong"
      >
        + Add my spend
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add my spend">
        <AddMySpendForm onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
