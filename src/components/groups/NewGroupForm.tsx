"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PersonPicker, { PersonValue } from "@/components/people/PersonPicker";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { apiPost } from "@/lib/api";

export default function NewGroupForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [members, setMembers] = useState<PersonValue[]>([{ name: "", baseCurrency: "USD" }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateMember(i: number, v: PersonValue) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? v : m)));
  }

  function addMemberField() {
    setMembers((prev) => [...prev, { name: "", baseCurrency: "USD" }]);
  }

  function removeMemberField(i: number) {
    setMembers((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const cleanMembers = members
      .filter((m) => m.name.trim())
      .map((m) => ({ name: m.name.trim(), contactId: m.contactId, baseCurrency: m.baseCurrency }));
    const result = await apiPost<{ group: { id: string } }>("/api/groups", { name, members: cleanMembers });
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Something went wrong");
      return;
    }
    onSuccess?.();
    router.push(`/groups/${result.data.group.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text">Group name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Japan trip"
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text">
          Other people in this group
          <InfoTooltip>
            <ul className="list-disc space-y-1 pl-3.5">
              <li>Typing a name that matches someone you've added before links to them automatically.</li>
              <li>To add a different person with the same name, make the name distinct (e.g. "John 2").</li>
            </ul>
          </InfoTooltip>
        </label>
        <div className="space-y-2">
          {members.map((m, i) => (
            <PersonPicker
              key={i}
              value={m}
              onChange={(v) => updateMember(i, v)}
              onRemove={members.length > 1 ? () => removeMemberField(i) : undefined}
              placeholder={`Person ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addMemberField}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          + Add another person
        </button>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create group"}
      </button>
    </form>
  );
}
