import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getAppMode, getAuthPagePath } from "@/lib/appMode";
import { prisma } from "@/lib/db";
import SettingsForms from "@/components/SettingsForms";

export default async function SettingsPage() {
  const session = getSessionFromCookies();
  if (!session) redirect(getAuthPagePath());

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, baseCurrency: true },
  });
  if (!user) redirect(getAuthPagePath());

  const mode = getAppMode();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-text">Settings</h1>
      <div className="mb-6 rounded-lg border border-border bg-surface px-4 py-3">
        <p className="text-sm font-medium text-text">App mode</p>
        <p className="text-sm text-text-muted">
          {mode === "offline"
            ? "Offline — local to this device, PIN-protected. Can't be changed."
            : "Online — cloud account. Can't be changed."}
        </p>
      </div>
      <SettingsForms initialEmail={user.email} initialBaseCurrency={user.baseCurrency} />
    </div>
  );
}
