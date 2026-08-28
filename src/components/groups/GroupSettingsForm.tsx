"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CurrencySelect from "@/components/ui/CurrencySelect";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { apiPost, apiPatch, apiDelete } from "@/lib/api";

export default function GroupSettingsForm({
  groupId,
  initialDefaultCurrency,
  initialSimplifyDebts,
  onSuccess,
}: {
  groupId: string;
  initialDefaultCurrency: string;
  initialSimplifyDebts: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [defaultCurrency, setDefaultCurrency] = useState(initialDefaultCurrency);
  const [simplifyDebts, setSimplifyDebts] = useState(initialSimplifyDebts);
  const [loading, setLoading] = useState(false);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleLeave() {
    setLeaving(true);
    const result = await apiPost(`/api/groups/${groupId}/leave`);
    setLeaving(false);
    if (!result.ok) {
      toast.error(result.error || "Couldn't leave group");
      setConfirmLeave(false);
      return;
    }
    toast.success("You left the group");
    router.push("/groups");
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await apiDelete(`/api/groups/${groupId}`);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error || "Couldn't delete group");
      setConfirmDelete(false);
      return;
    }
    toast.success("Group deleted");
    router.push("/groups");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await apiPatch(`/api/groups/${groupId}`, { defaultCurrency, simplifyDebts });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error || "Couldn't save settings");
      return;
    }
    toast.success("Group settings saved");
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text">Default currency</label>
        <p className="mb-2 text-xs text-text-faint">Pre-filled when adding an expense in this group.</p>
        <CurrencySelect value={defaultCurrency} onChange={setDefaultCurrency} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <label htmlFor="simplify-debts" className="block text-sm font-medium text-text">
            Simplify debts
          </label>
          <p className="max-w-xs text-xs text-text-faint">
            Reduce settlements to the fewest transactions (e.g. if A owes B and B owes C, show A owes C directly)
            instead of every pairwise debt.
          </p>
        </div>
        <button
          id="simplify-debts"
          type="button"
          role="switch"
          aria-checked={simplifyDebts}
          onClick={() => setSimplifyDebts((v) => !v)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            simplifyDebts ? "bg-primary" : "bg-surface-secondary"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              simplifyDebts ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save settings"}
      </button>

      <div className="space-y-2 border-t border-border pt-5">
        <button
          type="button"
          onClick={() => setConfirmLeave(true)}
          className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-text-muted hover:border-border-strong hover:text-text"
        >
          Leave group
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="w-full rounded-md border border-error px-4 py-2 text-sm font-medium text-error hover:bg-error-tint"
        >
          Delete group
        </button>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={handleLeave}
        title="Leave group"
        description="You can only leave once you don't owe anyone and no one owes you in this group. You'd need to be re-added to rejoin."
        confirmLabel="Leave group"
        danger
        loading={leaving}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete group"
        description="This permanently deletes the group and all its expenses. Only possible once everyone is settled up. This can't be undone."
        confirmLabel="Delete group"
        danger
        loading={deleting}
      />
    </form>
  );
}
