import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { getContactBalanceByCurrency } from "@/lib/people";

// Removes a person from the address book. Only allowed once every currency
// they're involved in nets to zero across every group they belong to.
// GroupMember.contactId is ON DELETE SET NULL, so deleting the contact just
// un-links future reuse — past group history (displayName snapshot) stays intact.
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
