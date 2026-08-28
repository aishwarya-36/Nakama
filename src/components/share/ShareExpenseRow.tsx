"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";

interface Member {
  id: string;
  displayName: string;
}
interface Split {
  groupMemberId: string;
  amount: number;
}

export default function ShareExpenseRow({
  description,
  paidByLabel,
  dateLabel,
  category,
  notes,
  amount,
  currency,
  contextLabel,
  members,
  splits,
}: {
  description: string;
  paidByLabel: string;
  dateLabel: string;
  category: string | null;
  notes: string | null;
  amount: number;
  currency: string;
  contextLabel?: string;
  members: Member[];
  splits: Split[];
}) {
  const [open, setOpen] = useState(false);
  const nameById = new Map(members.map((m) => [m.id, m.displayName]));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-mx-2 flex w-full items-center justify-between rounded-md px-2 py-3 text-left hover:bg-surface-secondary"
      >
        <div>
          {contextLabel && <div className="text-xs font-medium text-primary">{contextLabel}</div>}
          <div className="font-medium text-text">{description}</div>
          <div className="text-sm text-text-muted">
            Paid by {paidByLabel} · {dateLabel}
            {category && ` · ${category}`}
          </div>
        </div>
        <div className="font-medium text-text">
          {amount.toFixed(2)} {currency}
        </div>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Expense details">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-text-faint">Description</dt>
            <dd className="text-text">{description}</dd>
          </div>
          <div>
            <dt className="text-text-faint">Amount</dt>
            <dd className="text-text">
              {amount.toFixed(2)} {currency}
            </dd>
          </div>
          <div>
            <dt className="text-text-faint">Date</dt>
            <dd className="text-text">{dateLabel}</dd>
          </div>
          <div>
            <dt className="text-text-faint">Paid by</dt>
            <dd className="text-text">{paidByLabel}</dd>
          </div>
          <div>
            <dt className="text-text-faint">Category</dt>
            <dd className="text-text">{category || "—"}</dd>
          </div>
          {contextLabel && (
            <div>
              <dt className="text-text-faint">Group</dt>
              <dd className="text-text">{contextLabel}</dd>
            </div>
          )}
          <div>
            <dt className="text-text-faint">Notes</dt>
            <dd className="text-text">{notes || "—"}</dd>
          </div>
          <div>
            <dt className="mb-1 text-text-faint">Split</dt>
            <dd className="space-y-1 text-text">
              {splits.map((s) => (
                <div key={s.groupMemberId} className="flex items-center justify-between">
                  <span>{nameById.get(s.groupMemberId) || "—"}</span>
                  <span>
                    {s.amount.toFixed(2)} {currency}
                  </span>
                </div>
              ))}
            </dd>
          </div>
        </dl>
      </Modal>
    </>
  );
}
