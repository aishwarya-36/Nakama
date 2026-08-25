import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import SettingsForms from "@/components/SettingsForms";

export default async function SettingsPage() {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, baseCurrency: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-text">Settings</h1>
      <SettingsForms initialEmail={user.email} initialBaseCurrency={user.baseCurrency} />
    </div>
  );
}
