import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getAuthPagePath } from "@/lib/appMode";
import { prisma } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import ToastProvider from "@/components/ui/ToastProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = getSessionFromCookies();
  if (!session) redirect(getAuthPagePath());

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });
  if (!user) redirect(getAuthPagePath());

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar userName={user.name} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </ToastProvider>
  );
}
