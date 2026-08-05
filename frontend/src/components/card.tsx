import type { PropsWithChildren } from "react";

export function Card({ children }: PropsWithChildren): JSX.Element {
  return (
    <section className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-sm shadow-slate-200/70 backdrop-blur transition hover:shadow-md hover:shadow-slate-200/80 sm:p-6">
      {children}
    </section>
  );
}
