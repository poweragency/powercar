"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  FolderKanban,
  LogOut,
  Wrench,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Lead", icon: KanbanSquare },
  { href: "/cases", label: "Pratiche", icon: FolderKanban },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];

export function Sidebar({
  userEmail,
  workshopName,
}: {
  userEmail: string;
  workshopName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-bg-card border-r border-border flex flex-col h-screen">
      <div className="px-5 h-16 flex items-center gap-3 border-b border-border">
        <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0">
          <Wrench className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight truncate" title={workshopName}>
            {workshopName}
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:text-text hover:bg-bg-hover"
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="px-3 py-2 mb-2">
          <div className="text-xs text-text-subtle">Account</div>
          <div className="text-xs text-text-muted truncate" title={userEmail}>
            {userEmail}
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
            Esci
          </button>
        </form>
      </div>
    </aside>
  );
}
