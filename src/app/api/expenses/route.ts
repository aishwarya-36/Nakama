import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { resolveMember } from "@/lib/contacts";
import { findOrCreatePersonalGroup, type PersonalGroupParticipant } from "@/lib/personalGroups";
import { createExpense } from "@/lib/expenses";
import { expenseCoreFields } from "@/lib/expenseSchemas";

const personSchema = z.object({
  name: z.string().min(1),
  contactId: z.string().uuid().optional(),
  baseCurrency: z.string().length(3).optional(),
  email: z.string().email().optional(),
});

// ref: "me" or "person:<index>"
const refSchema = z.string().regex(/^(me|person:\d+)$/);

const schema = z.object({
  ...expenseCoreFields,
  people: z.array(personSchema),
  payers: z.array(z.object({ ref: refSchema, value: z.number() })).min(1),
  memberIds: z.array(refSchema).optional(),
  splits: z.array(z.object({ ref: refSchema, value: z.number() })).optional(),
});

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

  const participants: PersonalGroupParticipant[] = [];
  for (const person of people) {
    try {
      const resolved = await resolveMember(me.id, person);
      participants.push({ kind: resolved.kind, id: resolved.id });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "One of the selected people is invalid" }, { status: 400 });
    }
  }

  let group;
  try {
    group = await findOrCreatePersonalGroup(me.id, me.name, participants);
  } catch {
    return NextResponse.json({ error: "One of the selected people is invalid" }, { status: 400 });
  }

  const refToMemberId = new Map<string, string>();
  const meMember = group.members.find((m) => m.userId === me.id);
  if (meMember) refToMemberId.set("me", meMember.id);
  participants.forEach((p, i) => {
    const member = group!.members.find((m) => (p.kind === "user" ? m.userId === p.id : m.contactId === p.id));
    if (member) refToMemberId.set(`person:${i}`, member.id);
  });

  function resolveRef(ref: string): string | null {
    return refToMemberId.get(ref) || null;
  }

  const resolvedPayers: { id: string; value: number }[] = [];
  for (const p of payers) {
    const id = resolveRef(p.ref);
    if (!id) return NextResponse.json({ error: "Invalid payer" }, { status: 400 });
    resolvedPayers.push({ id, value: p.value });
  }

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

  const result = await createExpense({
    groupId: group.id,
    description,
    amount,
    currency,
    category,
    notes,
    date,
    splitType,
    payers: resolvedPayers,
    memberIds: memberIds ? resolvedMemberIds : undefined,
    splits: splits ? resolvedSplits : undefined,
    changedBy: meMember?.displayName || me.name,
    actorUserId: session.userId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ expense: result.expense, groupId: group.id }, { status: 201 });
}
