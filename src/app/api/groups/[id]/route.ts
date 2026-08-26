import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { computeGroupBalances } from "@/lib/balances";

async function assertMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId } });
  return !!membership;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertMember(params.id, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      members: true,
      expenses: {
        include: { splits: true, payments: { include: { groupMember: true } } },
        orderBy: { date: "desc" },
      },
    },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ group });
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  defaultCurrency: z.string().length(3).optional(),
  simplifyDebts: z.boolean().optional(),
});

// PATCH: update group settings (default currency, simplify-debts toggle).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertMember(params.id, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const group = await prisma.group.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ group });
}

// DELETE: permanently remove the group. Only allowed once every member's balance
// nets to zero in every currency — deleting a group with outstanding money owed
// would silently erase who owed whom.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertMember(params.id, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({ where: { id: params.id } });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const balances = await computeGroupBalances(params.id);
  const outstanding = balances.filter((b) => Object.values(b.byCurrency).some((amt) => Math.abs(amt) > 0.005));
  if (outstanding.length > 0) {
    return NextResponse.json(
      {
        error: `This group isn't settled up yet — ${outstanding
          .map((b) => b.displayName)
          .join(", ")} still ${outstanding.length === 1 ? "has" : "have"} an outstanding balance.`,
      },
      { status: 409 }
    );
  }

  await prisma.group.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
