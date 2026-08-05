import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../../../components/button";
import type { ResolveDisputeInput } from "../../../types/domain";

export type ResolveDisputeFormInput = Pick<ResolveDisputeInput, "freelancerAward" | "clientRefund">;

export function ResolveDisputeForm({ isSubmitting, onSubmit }: { isSubmitting: boolean; onSubmit: (input: ResolveDisputeFormInput) => Promise<void> }): JSX.Element {
  const [form, setForm] = useState<ResolveDisputeFormInput>({ freelancerAward: "", clientRefund: "" });
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof ResolveDisputeFormInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (Object.values(form).some((value) => !value.trim())) {
      setError("All dispute resolution fields are required.");
      return;
    }
    await onSubmit(form);
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
      <h3 className="font-semibold text-slate-900">Resolve Dispute</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="Freelancer award" value={form.freelancerAward} onChange={(event) => update("freelancerAward", event.target.value)} className={inputClass} />
        <input placeholder="Client refund" value={form.clientRefund} onChange={(event) => update("clientRefund", event.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Resolving..." : "Resolve Dispute"}</Button>
    </form>
  );
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
