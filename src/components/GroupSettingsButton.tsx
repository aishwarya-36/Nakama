"use client";
import { useState } from "react";
import Modal from "./Modal";
import GroupSettingsForm from "./GroupSettingsForm";

export default function GroupSettingsButton({
  groupId,
  defaultCurrency,
  simplifyDebts,
}: {
  groupId: string;
  defaultCurrency: string;
  simplifyDebts: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Group settings"
        title="Group settings"
        className="rounded-md border border-border p-2 text-text-muted hover:border-border-strong hover:text-text"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Group settings">
        <GroupSettingsForm
          groupId={groupId}
          initialDefaultCurrency={defaultCurrency}
          initialSimplifyDebts={simplifyDebts}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
