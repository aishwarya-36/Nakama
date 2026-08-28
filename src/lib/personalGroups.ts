import { prisma } from "./db";

/**
 * Finds (or creates) the implicit group backing a direct, no-group expense
 * between the owner and a fixed set of contacts. Contact ids are globally
 * unique (uuid pk), so the sorted-id signature alone is a safe, collision-free
 * key across users — no need to prefix it with the owner id.
 *
 * The empty-contacts case (a solo "my spend") has no contact id to anchor the
 * key, so it's prefixed with the owner id instead — otherwise every user's
 * solo-spend group would collide on the same key ("").
 */
export async function findOrCreatePersonalGroup(
  ownerId: string,
  ownerName: string,
  contactIds: string[]
) {
  const key =
    contactIds.length === 0 ? `solo:${ownerId}` : Array.from(new Set(contactIds)).sort().join(",");

  const existing = await prisma.group.findUnique({
    where: { personalKey: key },
    include: { members: true },
  });
  if (existing) return existing;

  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds }, ownerId },
  });
  if (contacts.length !== new Set(contactIds).size) {
    throw new Error("One of the selected people is invalid");
  }

  return prisma.group.create({
    data: {
      name: contacts.map((c) => c.name).join(", ") || "My spends",
      isPersonal: true,
      personalKey: key,
      members: {
        create: [
          { displayName: ownerName, userId: ownerId },
          ...contacts.map((c) => ({ displayName: c.name, contactId: c.id })),
        ],
      },
    },
    include: { members: true },
  });
}
