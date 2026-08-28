"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PersonPicker, { PersonValue } from "./PersonPicker";
import ExpenseTabsForm, { ExpensePayload, Participant } from "./ExpenseTabsForm";
import InfoTooltip from "./InfoTooltip";

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
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupMenuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) setGroupMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [groupMenuOpen]);

  async function toggleGroupMenu() {
    if (!groupsLoaded) {
      const res = await fetch("/api/groups");
      const data = await res.json().catch(() => ({ groups: [] }));
      setGroups(data.groups || []);
      setGroupsLoaded(true);
    }
    setGroupMenuOpen((v) => !v);
  }

  function addFromGroup(groupId: string) {
    setGroupMenuOpen(false);
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
          <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text">
            With
            <InfoTooltip>
              <ul className="list-disc space-y-1 pl-3.5">
                <li>Typing a name that matches someone you've added before links to them automatically.</li>
                <li>To add a different person with the same name, make the name distinct (e.g. "John 2").</li>
              </ul>
            </InfoTooltip>
          </label>
          <div className="space-y-2">
            {people.map((p, i) => (
              <PersonPicker
                key={i}
                value={p}
                onChange={(v) => updatePerson(i, v)}
                onRemove={() => removePersonField(i)}
                placeholder={`Person ${i + 1}`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" onClick={addPersonField} className="text-sm font-medium text-primary hover:underline">
              + Add person
            </button>
            <div ref={groupMenuRef} className="relative">
              <button
                type="button"
                onClick={toggleGroupMenu}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add group
              </button>
              {groupMenuOpen && (
                <div className="absolute z-10 mt-1 w-48 rounded-md border border-border bg-surface py-1 shadow-md">
                  {groups.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-text-faint">No groups yet</p>
                  ) : (
                    groups.map((g) => (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => addFromGroup(g.id)}
                        className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-secondary"
                      >
                        {g.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      }
    />
  );
}
