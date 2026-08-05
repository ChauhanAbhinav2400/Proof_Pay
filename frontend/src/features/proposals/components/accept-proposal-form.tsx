import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/button";
import { environment } from "../../../constants/environment";
import type { AcceptProposalInput, CreateEscrowMilestoneInput } from "../../../types/domain";

interface AcceptProposalFormProps {
  isSubmitting: boolean;
  onSubmit: (input: AcceptProposalInput) => Promise<void>;
  onCancel: () => void;
}

interface AcceptFormState {
  tokenAddress: string;
  acceptanceDeadline: string;
  milestones: CreateEscrowMilestoneInput[];
}

const emptyMilestone: CreateEscrowMilestoneInput = {
  title: "",
  description: "",
  amount: ""
};

export function AcceptProposalForm({ isSubmitting, onCancel, onSubmit }: AcceptProposalFormProps): JSX.Element {
  const [form, setForm] = useState<AcceptFormState>({
    tokenAddress: environment.mockUsdtAddress,
    acceptanceDeadline: "",
    milestones: [{ ...emptyMilestone }]
  });
  const [error, setError] = useState<string | null>(null);

  const updateMilestone = (index: number, field: keyof CreateEscrowMilestoneInput, value: string) => {
    setForm((current) => ({
      ...current,
      milestones: current.milestones.map((milestone, milestoneIndex) =>
        milestoneIndex === index ? { ...milestone, [field]: value } : milestone
      )
    }));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateAcceptForm(form);
    setError(validationError);
    if (validationError) return;
    await onSubmit({
      tokenAddress: form.tokenAddress.trim(),
      acceptanceDeadline: new Date(form.acceptanceDeadline).toISOString(),
      milestones: form.milestones.map((milestone) => ({
        title: milestone.title.trim(),
        description: milestone.description.trim(),
        amount: milestone.amount.trim()
      }))
    });
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Token address">
          <input value={form.tokenAddress} onChange={(event) => { setForm((current) => ({ ...current, tokenAddress: event.target.value })); setError(null); }} className={inputClass} />
        </Field>
        <Field label="Acceptance deadline">
          <input type="datetime-local" value={form.acceptanceDeadline} onChange={(event) => { setForm((current) => ({ ...current, acceptanceDeadline: event.target.value })); setError(null); }} className={inputClass} />
        </Field>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Escrow milestones</h3>
          <Button type="button" className="bg-slate-900 hover:bg-slate-800" onClick={() => setForm((current) => ({ ...current, milestones: [...current.milestones, { ...emptyMilestone }] }))}>
            <Plus size={16} /> <span className="ml-1">Add</span>
          </Button>
        </div>
        {form.milestones.map((milestone, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_1fr_120px_auto]">
            <input aria-label="Milestone title" placeholder="Title" value={milestone.title} onChange={(event) => updateMilestone(index, "title", event.target.value)} className={inputClass} />
            <input aria-label="Milestone description" placeholder="Description" value={milestone.description} onChange={(event) => updateMilestone(index, "description", event.target.value)} className={inputClass} />
            <input aria-label="Milestone amount" placeholder="Amount" value={milestone.amount} onChange={(event) => updateMilestone(index, "amount", event.target.value)} className={inputClass} />
            <Button type="button" aria-label="Remove milestone" disabled={form.milestones.length === 1} onClick={() => setForm((current) => ({ ...current, milestones: current.milestones.filter((_, milestoneIndex) => milestoneIndex !== index) }))} className="bg-red-600 px-3 hover:bg-red-700">
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Accepting..." : "Accept and Create Escrow"}</Button>
        <Button type="button" onClick={onCancel} className="bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</Button>
      </div>
    </form>
  );
}

function validateAcceptForm(form: AcceptFormState): string | null {
  if (!form.tokenAddress.trim()) return "Token address is required.";
  if (!form.acceptanceDeadline || new Date(form.acceptanceDeadline).getTime() <= Date.now()) return "Acceptance deadline must be in the future.";
  if (form.milestones.length === 0) return "At least one milestone is required.";
  if (form.milestones.some((milestone) => !milestone.title.trim() || !milestone.description.trim() || !milestone.amount.trim())) return "Every milestone needs a title, description, and amount.";
  if (form.milestones.some((milestone) => !isValidMockUsdtAmount(milestone.amount))) return "Milestone amounts must be positive numbers with up to 6 decimals.";
  return null;
}

function isValidMockUsdtAmount(value: string): boolean {
  const normalizedValue = value.trim();

  if (!/^(?:\d+|\d+\.\d{1,6})$/.test(normalizedValue)) {
    return false;
  }

  const [wholePart, decimalPart = ""] = normalizedValue.split(".");
  const hasNonZeroWhole = BigInt(wholePart) > 0n;
  const hasNonZeroDecimal = decimalPart.padEnd(6, "0") !== "000000";

  return hasNonZeroWhole || hasNonZeroDecimal;
}

function Field({ children, label }: { children: ReactNode; label: string }): JSX.Element {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
