import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPeopleWithBalances, PEOPLE_PAGE_SIZE } from "@/lib/people";
import PeopleList from "@/components/PeopleList";

export default async function PeoplePage() {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  const { people, total } = await getPeopleWithBalances(user.id, user.baseCurrency, { take: PEOPLE_PAGE_SIZE });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PeopleList initialPeople={people} initialTotal={total} baseCurrency={user.baseCurrency} />
    </div>
  );
}
