"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import PersonSettleUpForm from "@/components/people/PersonSettleUpForm";
import PersonAddPaymentForm from "@/components/people/PersonAddPaymentForm";
import { emitSettlementChanged } from "@/lib/events";

export default function PersonBalanceActions({
  contactId,
  contactName,
  defaultCurrency,
}: {
  contactId: string;
  contactName: string;
  defaultCurrency: string;
}) {
  const router = useRouter();
  const [settleOpen, setSettleOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  function onSettled() {
    emitSettlementChanged();
    router.refresh();
  }

  function onPaid() {
    setPayOpen(false);
    emitSettlementChanged();
    router.refresh();
  }

  return (
    <div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setSettleOpen(true)}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:border-border-strong"
        >
          Settle up
        </button>
        <button
          onClick={() => setPayOpen(true)}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:border-border-strong"
        >
          + Add payment
        </button>
      </div>

      <Modal open={settleOpen} onClose={() => setSettleOpen(false)} title="Settle up">
        <PersonSettleUpForm contactId={contactId} onDone={onSettled} />
      </Modal>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Add payment">
        <PersonAddPaymentForm
          contactId={contactId}
          contactName={contactName}
          defaultCurrency={defaultCurrency}
          onDone={onPaid}
        />
      </Modal>
    </div>
  );
}
