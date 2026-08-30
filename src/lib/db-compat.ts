import { prisma } from "./db";
import { getAppMode } from "./appMode";

// Prisma's `mode: "insensitive"` filter is Postgres/MongoDB-only and throws
// a validation error under the SQLite provider used by offline mode. SQLite
// already does ASCII-case-insensitive matching for `contains`/LIKE by
// default, so a plain `contains` is close enough there.
export function ciContains(value: string) {
  return getAppMode() === "offline"
    ? { contains: value }
    : { contains: value, mode: "insensitive" as const };
}

// SQLite has no case-insensitive `equals` (only `contains`/LIKE folds ASCII
// case), so an exact-match duplicate-name check needs a different query
// shape per backend. Excludes `excludeId` (for "is this name taken by some
// other person" checks during an edit).
export async function findContactByNameCI(ownerId: string, name: string, excludeId?: string) {
  if (getAppMode() === "offline") {
    const candidates = await prisma.contact.findMany({
      where: { ownerId, name: { contains: name } },
    });
    return (
      candidates.find(
        (c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== excludeId
      ) || null
    );
  }
  return prisma.contact.findFirst({
    where: {
      ownerId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      name: { equals: name, mode: "insensitive" },
    },
  });
}
