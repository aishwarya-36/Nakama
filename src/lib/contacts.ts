import { prisma } from "./db";

export interface PersonInput {
  name: string;
  contactId?: string;
  baseCurrency?: string;
}

/**
 * Resolves a person entry from the "add people" UI into a Contact id.
 * - If contactId is given, verifies it belongs to this user and reuses it.
 * - Otherwise, looks for an existing contact with the exact same name
 *   (case-insensitive) and links to that instead of creating a duplicate —
 *   typing a name that matches someone you've already added combines their
 *   history rather than forking off a second, disconnected person.
 * - Only creates a brand new Contact when no name match exists.
 */
export async function resolveContact(ownerId: string, person: PersonInput) {
  const existing = person.contactId
    ? await prisma.contact.findFirst({ where: { id: person.contactId, ownerId } })
    : await prisma.contact.findFirst({
        where: { ownerId, name: { equals: person.name.trim(), mode: "insensitive" } },
      });

  if (person.contactId && !existing) throw new Error("Contact not found");

  if (existing) {
    // Let the base currency be updated from this form if it changed.
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
