import { prisma } from "./db";
import { findContactByNameCI } from "./db-compat";

export interface PersonInput {
  name: string;
  contactId?: string;
  baseCurrency?: string;
  email?: string;
}

export type ResolvedMember =
  | { kind: "contact"; id: string; displayName: string }
  | { kind: "user"; id: string; displayName: string };

// Resolves a person entry to either a real linked account (when `email`
// matches an existing User — see CLAUDE.md's "claimed by a real account"
// note) or a guest Contact, creating/reusing the Contact as needed.
export async function resolveMember(ownerId: string, person: PersonInput): Promise<ResolvedMember> {
  if (person.contactId) {
    const existing = await prisma.contact.findFirst({ where: { id: person.contactId, ownerId } });
    if (!existing) throw new Error("Contact not found");
    return { kind: "contact", id: existing.id, displayName: existing.name };
  }

  const email = person.email?.trim().toLowerCase() || undefined;
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      if (user.id === ownerId) throw new Error("You can't add yourself");
      return { kind: "user", id: user.id, displayName: user.name };
    }
  }

  const existing = await findContactByNameCI(ownerId, person.name.trim());
  if (existing) {
    const data: { baseCurrency?: string; email?: string } = {};
    if (person.baseCurrency && person.baseCurrency !== existing.baseCurrency) data.baseCurrency = person.baseCurrency;
    if (email && !existing.email) data.email = email;
    const updated = Object.keys(data).length > 0 ? await prisma.contact.update({ where: { id: existing.id }, data }) : existing;
    return { kind: "contact", id: updated.id, displayName: updated.name };
  }

  const created = await prisma.contact.create({
    data: {
      ownerId,
      name: person.name.trim(),
      baseCurrency: person.baseCurrency || "USD",
      email,
    },
  });
  return { kind: "contact", id: created.id, displayName: created.name };
}
