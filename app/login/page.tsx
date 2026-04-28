import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/login-form";
import { hasAdminSession } from "@/lib/auth";

export default function LoginPage() {
  if (hasAdminSession()) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
