"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import NewGroupForm from "@/components/groups/NewGroupForm";

export default function NewGroupButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
      >
        + New group
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Start a new group">
        <NewGroupForm onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
