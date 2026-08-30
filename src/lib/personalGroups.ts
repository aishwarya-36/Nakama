import { prisma } from "./db";

export interface PersonalGroupParticipant {
  kind: "contact" | "user";
  id: string;
}

// key = sorted contact ids (unchanged format — already live in existing
// personal groups' personalKey, so contact-only participants must keep
// producing the exact same key), or "solo:<ownerId>" for a no-participant
// solo spend. A real linked user appends a distinguishing suffix so it
// never collides with an existing contact-only key.
function buildPersonalKey(ownerId: string, contactIds: string[], userIds: string[]): string {
  const base = contactIds.length === 0 ? `solo:${ownerId}` : Array.from(new Set(contactIds)).sort().join(",");
  return userIds.length === 0 ? base : `${base}|u:${Array.from(new Set(userIds)).sort().join(",")}`;
}

export async function findOrCreatePersonalGroup(
  ownerId: string,
  ownerName: string,
  participants: PersonalGroupParticipant[]
) {
  const contactIds = participants.filter((p) => p.kind === "contact").map((p) => p.id);
  const userIds = participants.filter((p) => p.kind === "user").map((p) => p.id);
  const key = buildPersonalKey(ownerId, contactIds, userIds);

  const existing = await prisma.group.findUnique({
    where: { personalKey: key },
    include: { members: true },
  });
  if (existing) return existing;

  const [contacts, users] = await Promise.all([
    prisma.contact.findMany({ where: { id: { in: contactIds }, ownerId } }),
    prisma.user.findMany({ where: { id: { in: userIds } } }),
  ]);
  if (contacts.length !== new Set(contactIds).size || users.length !== new Set(userIds).size) {
    throw new Error("One of the selected people is invalid");
  }

  return prisma.group.create({
    data: {
      name: [...contacts.map((c) => c.name), ...users.map((u) => u.name)].join(", ") || "My spends",
      isPersonal: true,
      personalKey: key,
      members: {
        create: [
          { displayName: ownerName, userId: ownerId },
          ...contacts.map((c) => ({ displayName: c.name, contactId: c.id })),
          ...users.map((u) => ({ displayName: u.name, userId: u.id })),
        ],
      },
    },
    include: { members: true },
  });
}
