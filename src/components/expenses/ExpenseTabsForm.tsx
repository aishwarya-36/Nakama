"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import DetailsTab from "./expense-form/DetailsTab";
import PaidByTab from "./expense-form/PaidByTab";
import SplitTab from "./expense-form/SplitTab";
import HistoryTab from "./expense-form/HistoryTab";

export interface Participant {
  ref: string;
  label: string;
}

export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export interface ExpensePayload {
  description: string;
  amount: number;
  currency: string;
  category: string;
  notes: string;
  date: string;
  splitType: SplitType;
  payers: { ref: string; value: number }[];
  memberIds?: string[];
  splits?: { ref: string; value: number }[];
}

export interface ExpenseHistoryEntry {
  summary: string;
  changedBy: string;
  createdAt: string;
}

const BASE_TABS = ["Details", "Paid by", "Split"] as const;

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function roundCents(n: number) {
  return Math.round(n * 100) / 100;
}

export default function ExpenseTabsForm({
  participants,
  defaultCurrency = "USD",
  detailsExtra,
  initial,
  historyEntries,
  onSubmit,
  onSuccess,
}: {
  participants: Participant[];
  defaultCurrency?: string;
  detailsExtra?: React.ReactNode;
  initial?: ExpensePayload;
  historyEntries?: ExpenseHistoryEntry[];
  onSubmit: (payload: ExpensePayload) => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
}) {
  const toast = useToast();
  const isEdit = !!initial;
  const TABS = historyEntries ? [...BASE_TABS, "History" as const] : BASE_TABS;
  const LAST_DATA_TAB = 2;
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [description, setDescription] = useState(initial?.description || "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency || defaultCurrency);
  const [category, setCategory] = useState(initial?.category || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [date, setDate] = useState(initial?.date.slice(0, 10) || todayISODate());
  const [attachment, setAttachment] = useState<File | null>(null);

  const defaultRef = participants[0]?.ref || "";
  const [payerRefs, setPayerRefs] = useState<string[]>(
    initial ? initial.payers.map((p) => p.ref) : defaultRef ? [defaultRef] : []
  );
  const [payerValues, setPayerValues] = useState<Record<string, string>>(
    initial ? Object.fromEntries(initial.payers.map((p) => [p.ref, String(p.value)])) : {}
  );

  const [splitType, setSplitType] = useState<SplitType>(initial?.splitType || "EQUAL");
  const [included, setIncluded] = useState<Record<string, boolean>>(
    initial
      ? Object.fromEntries(participants.map((p) => [p.ref, !!initial.splits?.some((s) => s.ref === p.ref)]))
      : Object.fromEntries(participants.map((p) => [p.ref, true]))
  );
  const [splitValues, setSplitValues] = useState<Record<string, string>>(
    initial ? Object.fromEntries((initial.splits || []).map((s) => [s.ref, String(s.value)])) : {}
  );

  // Keep a lone payer's amount tracking the total — the common case is one payer.
  useEffect(() => {
    if (payerRefs.length === 1) {
      setPayerValues((prev) => ({ ...prev, [payerRefs[0]]: amount }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  // New participants (e.g. added via "With") default to included in an EQUAL split.
  useEffect(() => {
    setIncluded((prev) => {
      const next = { ...prev };
      for (const p of participants) if (!(p.ref in next)) next[p.ref] = true;
      return next;
    });
    if (!payerRefs.length && defaultRef) setPayerRefs([defaultRef]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants.map((p) => p.ref).join(",")]);

  function togglePayer(ref: string) {
    setPayerRefs((prev) => {
      if (prev.includes(ref)) return prev.filter((r) => r !== ref);
      return [...prev, ref];
    });
  }
  function addPayerRow() {
    const next = participants.find((p) => !payerRefs.includes(p.ref));
    if (next) setPayerRefs((prev) => [...prev, next.ref]);
  }

  const payerSum = roundCents(payerRefs.reduce((sum, ref) => sum + (parseFloat(payerValues[ref]) || 0), 0));
  const amountNum = parseFloat(amount) || 0;
  const payerRemaining = roundCents(amountNum - payerSum);

  function toggleIncluded(ref: string) {
    setIncluded((prev) => ({ ...prev, [ref]: !prev[ref] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === LAST_DATA_TAB) submit();
  }

  async function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      setTab(0);
      return;
    }
    if (!description.trim()) {
      toast.error("Enter a description");
      setTab(0);
      return;
    }

    const payers = payerRefs
      .filter((ref) => payerValues[ref])
      .map((ref) => ({ ref, value: parseFloat(payerValues[ref]) || 0 }));
    if (payers.length === 0) {
      toast.error("Add at least one payer");
      setTab(1);
      return;
    }
    if (Math.abs(payerRemaining) > 0.004) {
      toast.error(`Payments must add up to the total (${payerRemaining > 0 ? "short" : "over"} by ${Math.abs(payerRemaining).toFixed(2)})`);
      setTab(1);
      return;
    }

    const payload: ExpensePayload = {
      description: description.trim(),
      amount: amt,
      currency,
      category,
      notes: notes.trim(),
      date: new Date(date + "T00:00:00.000Z").toISOString(),
      splitType,
      payers,
    };

    if (splitType === "EQUAL") {
      const refs = participants.filter((p) => included[p.ref]).map((p) => p.ref);
      if (refs.length === 0) {
        toast.error("Select at least one person to split with");
        setTab(2);
        return;
      }
      payload.memberIds = refs;
    } else {
      const splits = participants
        .filter((p) => splitValues[p.ref])
        .map((p) => ({ ref: p.ref, value: parseFloat(splitValues[p.ref]) || 0 }));
      if (splits.length === 0) {
        toast.error("Enter at least one split value");
        setTab(2);
        return;
      }
      payload.splits = splits;
    }

    setLoading(true);
    const result = await onSubmit(payload);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error || (isEdit ? "Couldn't save changes" : "Couldn't add expense"));
      return;
    }
    toast.success(isEdit ? "Expense updated" : "Expense added");
    onSuccess?.();
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && tab !== LAST_DATA_TAB) {
      e.preventDefault();
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(i)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === i ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <DetailsTab
          description={description}
          setDescription={setDescription}
          amount={amount}
          setAmount={setAmount}
          currency={currency}
          setCurrency={setCurrency}
          detailsExtra={detailsExtra}
          date={date}
          setDate={setDate}
          category={category}
          setCategory={setCategory}
          notes={notes}
          setNotes={setNotes}
          attachment={attachment}
          setAttachment={setAttachment}
        />
      )}

      {tab === 1 && (
        <PaidByTab
          participants={participants}
          payerRefs={payerRefs}
          setPayerRefs={setPayerRefs}
          payerValues={payerValues}
          setPayerValues={setPayerValues}
          currency={currency}
          payerRemaining={payerRemaining}
          togglePayer={togglePayer}
          addPayerRow={addPayerRow}
        />
      )}

      {tab === 2 && (
        <SplitTab
          participants={participants}
          splitType={splitType}
          setSplitType={setSplitType}
          included={included}
          toggleIncluded={toggleIncluded}
          splitValues={splitValues}
          setSplitValues={setSplitValues}
          currency={currency}
        />
      )}

      {tab === 3 && historyEntries && <HistoryTab historyEntries={historyEntries} />}

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setTab((t) => Math.max(0, t - 1))}
          disabled={tab === 0}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-border-strong hover:text-text disabled:opacity-40"
        >
          Back
        </button>
        {tab < 2 ? (
          <button
            type="button"
            onClick={() => setTab((t) => Math.min(2, t + 1))}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save changes" : "Add expense"}
          </button>
        )}
      </div>
    </form>
  );
}
