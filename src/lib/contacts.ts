import { prisma } from "./db";
import { findContactByNameCI } from "./db-compat";

export interface PersonInput {
  name: string;
  contactId?: string;
  baseCurrency?: string;
}

// Matches by name (case-insensitive) to reuse an existing contact, not just by id.
export async function resolveContact(ownerId: string, person: PersonInput) {
  const existing = person.contactId
    ? await prisma.contact.findFirst({ where: { id: person.contactId, ownerId } })
    : await findContactByNameCI(ownerId, person.name.trim());

  if (person.contactId && !existing) throw new Error("Contact not found");

  if (existing) {
    if (person.baseCurrency && person.baseCurrency !== existing.baseCurrency) {
      return prisma.contact.update({
        where: { id: existing.id },
        data: { baseCurrency: person.baseCurrency },
      });
    }
    return existing;
  }

  return prisma.contact.create({
    data: {
      ownerId,
      name: person.name.trim(),
      baseCurrency: person.baseCurrency || "USD",
    },
  });
}
