"use client";
import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import AddMySpendForm from "./AddMySpendForm";
import AddDirectExpenseForm from "./AddDirectExpenseForm";

export default function AddExpenseButton({
  userName,
  baseCurrency,
}: {
  userName: string;
  baseCurrency?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"mine" | "group" | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <>
      <div ref={boxRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
        >
          + Add expense
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-border bg-surface py-1 shadow-md">
            <button
              onClick={() => {
                setModal("mine");
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-secondary"
            >
              My spend
            </button>
            <button
              onClick={() => {
                setModal("group");
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-secondary"
            >
              Group spend
            </button>
          </div>
        )}
      </div>

      <Modal open={modal === "mine"} onClose={() => setModal(null)} title="Add my spend">
        <AddMySpendForm onSuccess={() => setModal(null)} defaultCurrency={baseCurrency} />
      </Modal>
      <Modal open={modal === "group"} onClose={() => setModal(null)} title="Add an expense">
        <AddDirectExpenseForm userName={userName} onSuccess={() => setModal(null)} />
      </Modal>
    </>
  );
}
