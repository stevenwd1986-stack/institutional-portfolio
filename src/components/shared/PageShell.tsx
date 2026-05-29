import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Upload, LogOut } from "lucide-react";
import { cn } from "../../lib/utils";

interface PageShellProps {
  title?: string;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients",   href: "/clients",   icon: Users },
  { label: "Import",    href: "/import",    icon: Upload },
];

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  clients:   "Clients",
  import:    "Import",
};

function getAdviser() {
  try {
    const raw = sessionStorage.getItem("adviser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PageShell({ title, children }: PageShellProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const adviser   = getAdviser();

  // Derive page title from path if not passed explicitly
  const segment   = location.pathname.split("/")[1] ?? "";
  const pageTitle = title ?? PAGE_TITLES[segment] ?? "";

  const currentDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const displayName = adviser?.name ?? "Adviser";
  const initials    = getInitials(displayName);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">

      {/* ── Sidebar — exactly matches advise-platform ──────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col bg-[#002147] h-full">

        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-white/10">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <div className="w-4 h-4 rounded-sm bg-white" />
            </div>
            <span className="text-white text-sm font-semibold leading-tight text-left">
              Institutional<br />Portfolio
            </span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = location.pathname === href || location.pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <button
                    onClick={() => navigate(href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                      active
                        ? "bg-[#E8F0FE] text-[#002147]"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 shrink-0",
                      active ? "text-[#002147]" : "text-white/60"
                    )} />
                    <span className="flex-1">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-[#003366] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              {adviser?.email && (
                <p className="text-xs text-white/50 truncate">{adviser.email}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem("adviser"); navigate("/auth"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Top header bar — matches advise-platform exactly */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-4">
            {pageTitle && (
              <h1 className="text-lg font-semibold text-[#0F172A]">{pageTitle}</h1>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-[#64748B]">{currentDate}</span>
            <div className="h-8 w-8 rounded-full bg-[#E8F0FE] flex items-center justify-center">
              <span className="text-[#002147] text-xs font-semibold">{initials}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
