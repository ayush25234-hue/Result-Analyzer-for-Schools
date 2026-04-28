import { redirect } from "next/navigation";

import { SettingsForm } from "@/components/forms/settings-form";
import { hasAdminSession } from "@/lib/auth";

export default function SettingsRoute() {
  if (!hasAdminSession()) {
    redirect("/login?next=/settings");
  }

  return <SettingsForm />;
}
