import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { resolveContact } from "@/lib/contacts";
import { findOrCreatePersonalGroup } from "@/lib/personalGroups";
import { computeSplitRows, validatePayers } from "@/lib/splits";

const personSchema = z.object({
  name: z.string().min(1),
  contactId: z.string().uuid().optional(),
  baseCurrency: z.string().length(3).optional(),
});

// A participant ref is "me" or "person:<index into people[]>".
const refSchema = z.string().regex(/^(me|person:\d+)$/);

const schema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  category: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().datetime().optional(),
  splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]).default("EQUAL"),
  // Empty = a solo "my spend" entry with no one else on it.
  people: z.array(personSchema),
  payers: z.array(z.object({ ref: refSchema, value: z.number() })).min(1),
  memberIds: z.array(refSchema).optional(),
  splits: z.array(z.object({ ref: refSchema, value: z.number() })).optional(),
});

// Adds an expense shared directly with one or more people, with no explicit
// group. Behind the scenes it's still backed by a group (find-or-create,
// hidden from the Groups list) — money always flows through GroupMember.
export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { description, amount, currency, category, notes, date, splitType, people, payers, memberIds, splits } =
    parsed.data;

  const contactIds: string[] = [];
  for (const person of people) {
    try {
      const contact = await resolveContact(me.id, person);
      contactIds.push(contact.id);
    } catch {
      return NextResponse.json({ error: "One of the selected people is invalid" }, { status: 400 });
    }
  }

  let group;
  try {
    group = await findOrCreatePersonalGroup(me.id, me.name, contactIds);
  } catch {
    return NextResponse.json({ error: "One of the selected people is invalid" }, { status: 400 });
  }

  // ref ("me" / "person:<i>") -> actual GroupMember id
  const refToMemberId = new Map<string, string>();
  const meMember = group.members.find((m) => m.userId === me.id);
  if (meMember) refToMemberId.set("me", meMember.id);
  contactIds.forEach((contactId, i) => {
    const member = group!.members.find((m) => m.contactId === contactId);
    if (member) refToMemberId.set(`person:${i}`, member.id);
  });

  function resolveRef(ref: string): string | null {
    return refToMemberId.get(ref) || null;
  }

  const validIds = new Set(group.members.map((m) => m.id));
  const allIds = group.members.map((m) => m.id);

  const resolvedPayers: { id: string; value: number }[] = [];
  for (const p of payers) {
    const id = resolveRef(p.ref);
    if (!id) return NextResponse.json({ error: "Invalid payer" }, { status: 400 });
    resolvedPayers.push({ id, value: p.value });
  }
  const payerResult = validatePayers(resolvedPayers, amount, validIds);
  if ("error" in payerResult) {
    return NextResponse.json({ error: payerResult.error }, { status: 400 });
  }
  const paymentRows = payerResult.map((r) => ({ groupMemberId: r.id, amount: r.amount }));

  const resolvedMemberIds: string[] = [];
  for (const ref of memberIds || []) {
    const id = resolveRef(ref);
    if (!id) return NextResponse.json({ error: "Invalid member in split" }, { status: 400 });
    resolvedMemberIds.push(id);
  }
  const resolvedSplits: { id: string; value: number }[] = [];
  for (const s of splits || []) {
    const id = resolveRef(s.ref);
    if (!id) return NextResponse.json({ error: "Invalid member in split" }, { status: 400 });
    resolvedSplits.push({ id, value: s.value });
  }

  const result = computeSplitRows(
    splitType,
    amount,
    validIds,
    allIds,
    memberIds ? resolvedMemberIds : undefined,
    splits ? resolvedSplits : undefined
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const splitRows = result.map((r) => ({ groupMemberId: r.id, amount: r.amount }));

  const expense = await prisma.expense.create({
    data: {
      groupId: group.id,
      description,
      amount,
      currency,
      category: category || null,
      notes: notes || null,
      splitType,
      date: date ? new Date(date) : undefined,
      payments: { create: paymentRows },
      splits: { create: splitRows },
      history: { create: { changedBy: meMember?.displayName || me.name, summary: "Created" } },
    },
    include: { splits: true, payments: { include: { groupMember: true } } },
  });

  return NextResponse.json({ expense, groupId: group.id }, { status: 201 });
}
