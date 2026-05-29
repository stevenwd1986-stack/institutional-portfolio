import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Upload, Bell } from "lucide-react";
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

export function PageShell({ title, children }: PageShellProps) {
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <div className="h-screen bg-slate-950 flex overflow-hidden">
      {/* Sidebar — Oxford Navy, matches advise-platform */}
      <aside className="w-56 shrink-0 bg-slate-900 border-r border-white/10 flex flex-col h-full">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white text-xs font-bold">IP</span>
            </div>
            <span className="text-sm font-semibold text-white font-['Space_Grotesk']">PortfolioIQ</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = location.pathname.startsWith(href);
            return (
              <button
                key={href}
                onClick={() => navigate(href)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <Bell className="w-4 h-4" />
            Alerts
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-950">
        {title && (
          <div className="px-8 pt-8 pb-2">
            <h1 className="text-xl font-semibold text-[#0F172A] font-['Space_Grotesk']">{title}</h1>
          </div>
        )}
        <div className="px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
