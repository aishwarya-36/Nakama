import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OverviewCards from "@/components/OverviewCards";
import MonthlySpendingChart from "@/components/MonthlySpendingChart";
import AddExpenseButton from "@/components/AddExpenseButton";
import RecentExpensesTable from "@/components/RecentExpensesTable";

export default async function ExpensesPage() {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">Your expenses</h1>
        <AddExpenseButton userName={user.name} baseCurrency={user.baseCurrency} />
      </div>
      <p className="mb-6 text-sm text-text-muted">
        A personal view across every group, converted to your base currency ({user.baseCurrency}).
      </p>

      <OverviewCards variant="spending" />

      <div className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-text">Your share of spending, by month</h2>
        <MonthlySpendingChart />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-text">Recent spending</h2>
        <RecentExpensesTable />
      </div>
    </div>
  );
}
