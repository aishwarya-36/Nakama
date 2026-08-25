"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PersonPicker, { PersonValue } from "./PersonPicker";
import { useToast } from "./ToastProvider";

export default function AddMemberForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [person, setPerson] = useState<PersonValue>({ name: "", baseCurrency: "USD" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!person.name.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: person.name.trim(),
        contactId: person.contactId,
        baseCurrency: person.baseCurrency,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't add member");
      return;
    }
    toast.success(`${person.name.trim()} added to group`);
    setPerson({ name: "", baseCurrency: "USD" });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <PersonPicker value={person} onChange={setPerson} placeholder="Add a person by name" />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-tint disabled:opacity-60"
      >
        Add
      </button>
    </form>
  );
}
