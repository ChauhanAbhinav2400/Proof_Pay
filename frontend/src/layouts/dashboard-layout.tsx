import { Outlet } from "react-router-dom";
import { AppLogo } from "../components/app-logo";
import { Sidebar } from "../components/sidebar";
import { Topbar } from "../components/topbar";

export function DashboardLayout(): JSX.Element {
  return (
    <div className="h-screen overflow-hidden bg-slate-950/5 text-slate-950">
      <div className="flex h-full min-h-0">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl pb-28 lg:pb-10">
              <div className="mb-5 rounded-3xl border border-white/70 bg-white/55 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
                <AppLogo />
              </div>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
