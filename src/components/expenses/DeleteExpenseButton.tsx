"use client";
import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { apiDelete } from "@/lib/api";

export default function DeleteExpenseButton({
  groupId,
  expenseId,
  onDeleted,
}: {
  groupId: string;
  expenseId: string;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await apiDelete(`/api/groups/${groupId}/expenses/${expenseId}`);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error || "Couldn't delete expense");
      return;
    }
    setConfirmOpen(false);
    toast.success("Expense deleted");
    onDeleted();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label="Delete expense"
        title="Delete expense"
        className="rounded-md p-1 text-text-faint hover:bg-error-tint hover:text-error"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete expense?"
        description="This can't be undone. The expense stays visible in history, but no longer counts toward any balance."
        confirmLabel="Delete"
        danger
        loading={loading}
      />
    </>
  );
}
