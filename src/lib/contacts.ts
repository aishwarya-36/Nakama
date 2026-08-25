import { prisma } from "./db";

export interface PersonInput {
  name: string;
  contactId?: string;
  baseCurrency?: string;
}

/**
 * Resolves a person entry from the "add people" UI into a Contact id.
 * - If contactId is given, verifies it belongs to this user and reuses it
 *   (this is how the same guest combines across groups — only ever via an
 *   explicit pick, never by matching on name).
 * - Otherwise creates a brand new Contact, even if the name matches an
 *   existing one — two different people are allowed to share a name.
 */
export async function resolveContact(ownerId: string, person: PersonInput) {
  if (person.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: person.contactId, ownerId },
    });
    if (!contact) throw new Error("Contact not found");
    // Let the base currency be updated from this form if it changed.
    if (person.baseCurrency && person.baseCurrency !== contact.baseCurrency) {
      return prisma.contact.update({
        where: { id: contact.id },
        data: { baseCurrency: person.baseCurrency },
      });
    }
    return contact;
  }

  return prisma.contact.create({
    data: {
      ownerId,
      name: person.name,
      baseCurrency: person.baseCurrency || "USD",
    },
  });
}
