"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

export default function PersonShareLinkButton({ personId }: { personId: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function openModal() {
    setOpen(true);
    if (url) return;
    setLoading(true);
    const res = await fetch(`/api/people/${personId}/share-link`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) setUrl(data.url);
    else toast.error(data.error || "Couldn't create share link");
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        aria-label="Share link"
        title="Share link"
        className="rounded-md border border-border p-2 text-text-muted hover:border-border-strong hover:text-text"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07l-1.5 1.5" />
          <path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07l1.5-1.5" />
        </svg>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Share link">
        <p className="mb-3 text-sm text-text-muted">
          Anyone with this link can view balances and expenses shared with this person — no login required,
          and nothing can be edited from it.
        </p>
        {loading ? (
          <p className="text-sm text-text-faint">Generating link…</p>
        ) : (
          <div className="flex gap-2">
            <input
              readOnly
              value={url || ""}
              onFocus={(e) => e.target.select()}
              className="w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            />
            <button
              onClick={copy}
              aria-label="Copy link"
              title="Copy link"
              className="shrink-0 rounded-md p-2 text-primary hover:bg-primary/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
