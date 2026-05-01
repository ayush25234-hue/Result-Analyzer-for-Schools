"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, FileText, Settings, UploadCloud, Users } from "lucide-react";

import { useAuthSession } from "@/components/layout/auth-session-provider";
import { navigation } from "@/lib/constants";
import { cn } from "@/lib/utils";

const iconMap = {
  Dashboard: BarChart3,
  Upload: UploadCloud,
  Students: Users,
  "Filter Students": FileText,
  Settings: Settings
};

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuthSession();
  const visibleNavigation = navigation.filter((item) => isAdmin || !["/upload", "/settings"].includes(item.href));

  return (
    <aside className="flex w-full flex-col justify-between rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur xl:w-72">
      <div className="space-y-8">
        <div className="rounded-[1.5rem] bg-ink px-5 py-6 text-white">
          <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-3">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold">UP Board Multi-College Result Analyzer</h1>
          <p className="mt-2 text-sm text-slate-200">
            Secure result analytics from user-provided data only.
          </p>
        </div>

        <nav className="space-y-2">
          {visibleNavigation.map((item) => {
            const Icon = iconMap[item.label as keyof typeof iconMap];
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-gradient-to-r from-ink to-pine text-white shadow-soft"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-mist p-4 text-sm text-slate-600">
        {isAdmin
          ? "Admin mode is active. You can manage imports, settings, and student records."
          : "Read-only mode is active. Public visitors can view analytics and reports but cannot change data."}
      </div>
    </aside>
  );
}
