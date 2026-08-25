"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PersonPicker, { PersonValue } from "./PersonPicker";
import ExpenseTabsForm, { ExpensePayload, Participant } from "./ExpenseTabsForm";

interface GroupMemberOption {
  displayName: string;
  contactId: string | null;
}
interface GroupOption {
  id: string;
  name: string;
  members: GroupMemberOption[];
}

// A participant is "me" or "person:<index into people[]>" — same ref scheme
// the /api/expenses route expects, so the payload can be sent as-is.
export default function AddDirectExpenseForm({
  userName,
  onSuccess,
}: {
  userName: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [people, setPeople] = useState<PersonValue[]>([{ name: "", baseCurrency: "USD" }]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");

  async function loadGroups() {
    if (groupsLoaded) return;
    const res = await fetch("/api/groups");
    const data = await res.json().catch(() => ({ groups: [] }));
    setGroups(data.groups || []);
    setGroupsLoaded(true);
  }

  function addFromGroup(groupId: string) {
    setSelectedGroup("");
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const existingContactIds = new Set(people.map((p) => p.contactId).filter(Boolean));
    const additions: PersonValue[] = group.members
      .filter((m): m is GroupMemberOption & { contactId: string } => !!m.contactId && !existingContactIds.has(m.contactId))
      .map((m) => ({ name: m.displayName, contactId: m.contactId, baseCurrency: "USD" }));
    if (additions.length === 0) return;
    setPeople((prev) => [...prev.filter((p) => p.name.trim()), ...additions]);
  }

  const activePeople = people.filter((p) => p.name.trim());
  const participants: Participant[] = [
    { ref: "me", label: `${userName} (you)` },
    ...activePeople.map((p, i) => ({ ref: `person:${i}`, label: p.name })),
  ];

  function updatePerson(i: number, v: PersonValue) {
    setPeople((prev) => prev.map((p, idx) => (idx === i ? v : p)));
  }
  function addPersonField() {
    setPeople((prev) => [...prev, { name: "", baseCurrency: "USD" }]);
  }
  function removePersonField(i: number) {
    setPeople((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(payload: ExpensePayload) {
    if (activePeople.length === 0) {
      return { ok: false, error: "Add at least one other person under With" };
    }
    const body = {
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency,
      category: payload.category || undefined,
      notes: payload.notes || undefined,
      date: payload.date,
      splitType: payload.splitType,
      people: activePeople.map((p) => ({ name: p.name.trim(), contactId: p.contactId, baseCurrency: p.baseCurrency })),
      payers: payload.payers,
      memberIds: payload.memberIds,
      splits: payload.splits,
    };
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error };
    }
    router.refresh();
    return { ok: true };
  }

  function handleSuccess() {
    setPeople([{ name: "", baseCurrency: "USD" }]);
    onSuccess?.();
  }

  return (
    <ExpenseTabsForm
      participants={participants}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      detailsExtra={
        <div>
          <label className="block text-sm font-medium text-text">With</label>
          <p className="mb-2 text-xs text-text-faint">
            Type a name — pick an existing person to combine their history, or type a fresh name to add someone new.
          </p>
          <div className="space-y-2">
            {people.map((p, i) => (
              <PersonPicker
                key={i}
                value={p}
                onChange={(v) => updatePerson(i, v)}
                onRemove={people.length > 1 ? () => removePersonField(i) : undefined}
                placeholder={`Person ${i + 1}`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" onClick={addPersonField} className="text-sm font-medium text-primary hover:underline">
              + Add another person
            </button>
            <select
              value={selectedGroup}
              onFocus={loadGroups}
              onChange={(e) => addFromGroup(e.target.value)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            >
              <option value="">+ Add everyone from a group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      }
    />
  );
}
