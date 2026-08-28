"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { apiPatch } from "@/lib/api";

export default function GroupNameEditor({ groupId, name }: { groupId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [loading, setLoading] = useState(false);

  function cancel() {
    setValue(name);
    setEditing(false);
  }

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      cancel();
      return;
    }
    setLoading(true);
    const result = await apiPatch(`/api/groups/${groupId}`, { name: trimmed });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error || "Couldn't rename group");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          disabled={loading}
          className="rounded-md border border-border bg-surface px-2 py-1 text-2xl font-semibold text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={save}
          disabled={loading}
          aria-label="Save name"
          title="Save"
          className="rounded-md p-1.5 text-primary hover:bg-primary-tint disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={loading}
          aria-label="Cancel"
          title="Cancel"
          className="rounded-md p-1.5 text-text-faint hover:bg-surface-secondary hover:text-text disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-2xl font-semibold text-text">{name}</h1>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit group name"
        title="Edit name"
        className="rounded-md p-1.5 text-text-faint hover:bg-surface-secondary hover:text-text"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>
    </div>
  );
}
