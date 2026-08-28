import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import {
  getUserExpensesPage,
  rangeToFrom,
  EXPENSE_RANGES,
  EXPENSE_SCOPES,
  EXPENSE_OWE_FILTERS,
  type ExpenseRange,
  type ExpenseScope,
  type ExpenseOweFilter,
} from "@/lib/userExpenses";

export async function GET(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const rangeParam = params.get("range");
  const range = EXPENSE_RANGES.includes(rangeParam as ExpenseRange) ? (rangeParam as ExpenseRange) : undefined;
  const scopeParam = params.get("scope");
  const scope = EXPENSE_SCOPES.includes(scopeParam as ExpenseScope) ? (scopeParam as ExpenseScope) : undefined;
  const oweParam = params.get("owe");
  const owe = EXPENSE_OWE_FILTERS.includes(oweParam as ExpenseOweFilter) ? (oweParam as ExpenseOweFilter) : undefined;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const q = params.get("q")?.trim() || "";

  const result = await getUserExpensesPage(session.userId, {
    from: rangeToFrom(range),
    page,
    pageSize: 10,
    q,
    scope,
    owe,
  });
  return NextResponse.json(result);
}
