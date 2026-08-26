"use client";
import { useState } from "react";
import Modal from "./Modal";
import EditPersonForm, { EditablePerson } from "./EditPersonForm";

export default function EditPersonButton({
  person,
  onSaved,
}: {
  person: EditablePerson;
  onSaved: (updated: EditablePerson) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${person.name}`}
        title="Edit person"
        className="rounded-md p-1 text-text-faint hover:bg-surface-secondary hover:text-text"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit person">
        <EditPersonForm
          person={person}
          onSaved={(updated) => {
            onSaved(updated);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
}
