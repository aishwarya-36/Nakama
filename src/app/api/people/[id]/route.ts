import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { getContactBalanceByCurrency } from "@/lib/people";
import { findContactByNameCI } from "@/lib/db-compat";

const patchSchema = z.object({
  name: z.string().min(1),
  baseCurrency: z.string().length(3).optional(),
  email: z.string().email().optional().or(z.literal("")),
  upiId: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, ownerId: session.userId },
  });
  if (!contact) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  const dupe = await findContactByNameCI(session.userId, name, contact.id);
  if (dupe) {
    return NextResponse.json(
      { error: `You already have a person named "${dupe.name}" — use a different name, e.g. "${dupe.name} 2".` },
      { status: 409 }
    );
  }

  const data = {
    name,
    baseCurrency: parsed.data.baseCurrency || contact.baseCurrency,
    email: parsed.data.email || null,
    upiId: parsed.data.upiId?.trim() || null,
  };

  const [updated] = await prisma.$transaction([
    prisma.contact.update({ where: { id: contact.id }, data }),
    prisma.groupMember.updateMany({ where: { contactId: contact.id }, data: { displayName: name } }),
  ]);

  return NextResponse.json({ contact: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, ownerId: session.userId },
  });
  if (!contact) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const byCurrency = await getContactBalanceByCurrency(contact.id);
  const outstanding = Object.entries(byCurrency).filter(([, amount]) => Math.abs(amount) > 0.005);
  if (outstanding.length > 0) {
    const summary = outstanding
      .map(([currency, amount]) => `${amount > 0 ? "owed" : "owes"} ${Math.abs(amount).toFixed(2)} ${currency}`)
      .join(", ");
    return NextResponse.json(
      { error: `${contact.name} still has an outstanding balance: ${summary}` },
      { status: 409 }
    );
  }

  await prisma.contact.delete({ where: { id: contact.id } });
  return NextResponse.json({ ok: true });
}
