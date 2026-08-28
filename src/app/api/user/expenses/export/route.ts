import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSessionFromCookies } from "@/lib/auth";
import {
  getAllUserExpenses,
  rangeToFrom,
  EXPENSE_RANGES,
  EXPENSE_SCOPES,
  type ExpenseRange,
  type ExpenseScope,
} from "@/lib/userExpenses";

export async function GET(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const rangeParam = params.get("range");
  const range = EXPENSE_RANGES.includes(rangeParam as ExpenseRange) ? (rangeParam as ExpenseRange) : undefined;
  const scopeParam = params.get("scope");
  const scope = EXPENSE_SCOPES.includes(scopeParam as ExpenseScope) ? (scopeParam as ExpenseScope) : undefined;

  const rows = await getAllUserExpenses(session.userId, rangeToFrom(range), undefined, scope);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Expenses");
  sheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Description", key: "description", width: 30 },
    { header: "Category", key: "category", width: 16 },
    { header: "Group", key: "groupName", width: 20 },
    { header: "Paid by", key: "paidByName", width: 20 },
    { header: "Your share", key: "yourShare", width: 14 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Notes", key: "notes", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const r of rows) {
    sheet.addRow({
      date: r.date.toISOString().slice(0, 10),
      description: r.description,
      category: r.category || "",
      groupName: r.groupName,
      paidByName: r.paidByName,
      yourShare: r.yourShare,
      amount: r.amount,
      currency: r.currency,
      notes: r.notes || "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `expenses${range ? `-${range}` : ""}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
