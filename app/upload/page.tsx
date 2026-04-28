import { redirect } from "next/navigation";

import { hasAdminSession } from "@/lib/auth";
import { UploadWorkbench } from "@/components/upload/upload-workbench";

export default function UploadRoute() {
  if (!hasAdminSession()) {
    redirect("/login?next=/upload");
  }

  return <UploadWorkbench />;
}
