import { prisma } from "./db";

// key = sorted contact ids, or "solo:<ownerId>" for a no-contact solo spend.
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
