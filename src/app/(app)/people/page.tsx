import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPeopleWithBalances } from "@/lib/people";
import PeopleList from "@/components/PeopleList";
import AddPersonForm from "@/components/AddPersonForm";

export default async function PeoplePage() {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  const people = await getPeopleWithBalances(user.id, user.baseCurrency);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-text">People</h1>
      <p className="mb-6 text-sm text-text-muted">
        Everyone you've added, across every group and direct expense — balances shown in {user.baseCurrency}.
      </p>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Add a person</h2>
        <AddPersonForm />
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Everyone</h2>
        <PeopleList initialPeople={people} baseCurrency={user.baseCurrency} />
      </div>
    </div>
  );
}
