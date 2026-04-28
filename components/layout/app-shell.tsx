"use client";

import { ActiveSessionProvider } from "@/components/layout/active-session-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ActiveSessionProvider>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.16),_transparent_22%),#f8fbfd] bg-board-grid bg-[size:34px_34px]">
        <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 p-4 xl:flex-row xl:p-6">
          <Sidebar />
          <main className="flex-1 space-y-6">
            <Topbar />
            {children}
          </main>
        </div>
      </div>
    </ActiveSessionProvider>
  );
}
