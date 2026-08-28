"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import PersonForm from "@/components/people/PersonForm";

export default function AddPersonButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
      >
        + Add person
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a person">
        <PersonForm onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
