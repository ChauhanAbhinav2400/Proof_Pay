import { Outlet } from "react-router-dom";
import { Navbar } from "../components/navbar";

export function AuthLayout(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto flex max-w-6xl justify-center px-6 py-16">
        <Outlet />
      </main>
    </div>
  );
}
