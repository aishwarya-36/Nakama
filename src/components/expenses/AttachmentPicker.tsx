"use client";
import { useRef } from "react";
import { useToast } from "@/components/ui/ToastProvider";

const MAX_BYTES = 0.5 * 1024 * 1024; // 0.5 MB
const ACCEPT =
  "image/*,application/pdf,.pdf,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Not uploaded anywhere yet — validation only.
export default function AttachmentPicker({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] || null;
    e.target.value = "";
    if (!picked) return;
    if (picked.size > MAX_BYTES) {
      toast.error("File must be under 0.5 MB");
      return;
    }
    onChange(picked);
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleChange} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 015 5l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.48" />
        </svg>
        Attach
      </button>
      {file && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
          <span className="truncate">{file.name}</span>
          <button type="button" onClick={() => onChange(null)} className="text-text-faint hover:text-error">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
