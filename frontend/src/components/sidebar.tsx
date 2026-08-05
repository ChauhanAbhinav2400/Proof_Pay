import { BriefcaseBusiness, Gavel, HandCoins, LayoutDashboard, ListChecks, Shield, Sparkles, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";
import { AppLogo } from "./app-logo";

const baseLinks = [["/dashboard", "Dashboard", LayoutDashboard], ["/projects", "Browse Projects", BriefcaseBusiness], ["/my-projects", "My Projects", ListChecks], ["/my-work", "My Work", Users], ["/escrows", "Escrows", HandCoins]] as const;

export function Sidebar(): JSX.Element {
  const { user } = useAuth();
  const links = [
    ...baseLinks,
    ...(user?.permissions.includes("ARBITRATOR") ? [["/arbitrator", "Arbitrator", Gavel] as const] : []),
    ...(user?.permissions.includes("ADMIN") ? [["/admin", "Admin", Shield] as const] : [])
  ];
  return (
    <>
      <aside className="hidden h-full w-72 shrink-0 border-r border-white/70 bg-white/80 px-4 py-5 shadow-xl shadow-slate-200/50 backdrop-blur lg:block">
        <div className="flex h-full min-h-0 flex-col">
          <AppLogo />
          <div className="mt-6 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              <Sparkles size={14} />
              Web3 Workspace
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hire, escrow, deliver, and release payments with clear on-chain checkpoints.
            </p>
          </div>
          <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {links.map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-900/15"
                      : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
                  }`
                }
              >
                <span className="grid size-9 place-items-center rounded-xl bg-white/15">
                  <Icon size={18} />
                </span>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-500">
            Permission-aware navigation is powered by your backend profile.
          </div>
        </div>
      </aside>
      <nav className="fixed inset-x-3 bottom-3 z-40 flex gap-1 overflow-x-auto rounded-3xl border border-white/70 bg-slate-950/90 p-2 shadow-2xl shadow-slate-950/30 backdrop-blur lg:hidden">
        {links.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              `flex min-w-16 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium transition ${
                isActive ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            <span className="max-w-16 truncate">{label.replace("Browse ", "")}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
