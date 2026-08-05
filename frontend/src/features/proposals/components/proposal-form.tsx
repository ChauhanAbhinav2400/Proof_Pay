import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Button } from "../../../components/button";
import type { CreateProposalInput, Proposal, UpdateProposalInput } from "../../../types/domain";

interface ProposalFormProps {
  proposal?: Proposal;
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: (input: CreateProposalInput | UpdateProposalInput) => Promise<void>;
  onCancel?: () => void;
}

interface ProposalFormState {
  coverLetter: string;
  proposedBudget: string;
  estimatedDuration: string;
}

const emptyState: ProposalFormState = {
  coverLetter: "",
  proposedBudget: "",
  estimatedDuration: ""
};

export function ProposalForm({ proposal, isSubmitting, submitLabel, onSubmit, onCancel }: ProposalFormProps): JSX.Element {
  const [form, setForm] = useState<ProposalFormState>(emptyState);
  const [errors, setErrors] = useState<Partial<Record<keyof ProposalFormState, string>>>({});

  useEffect(() => {
    if (!proposal) return;
    setForm({
      coverLetter: proposal.coverLetter,
      proposedBudget: proposal.proposedBudget,
      estimatedDuration: proposal.estimatedDuration
    });
  }, [proposal]);

  const updateField = (field: keyof ProposalFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateProposalForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    await onSubmit({
      coverLetter: form.coverLetter.trim(),
      proposedBudget: form.proposedBudget.trim(),
      estimatedDuration: form.estimatedDuration.trim()
    });
    if (!proposal) setForm(emptyState);
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <Field label="Cover letter" error={errors.coverLetter}>
        <textarea value={form.coverLetter} onChange={(event) => updateField("coverLetter", event.target.value)} className={`${inputClass} min-h-32`} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Proposed budget" error={errors.proposedBudget}>
          <input value={form.proposedBudget} onChange={(event) => updateField("proposedBudget", event.target.value)} className={inputClass} />
        </Field>
        <Field label="Estimated duration" error={errors.estimatedDuration}>
          <input value={form.estimatedDuration} onChange={(event) => updateField("estimatedDuration", event.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : submitLabel}</Button>
        {onCancel && <Button type="button" onClick={onCancel} className="bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</Button>}
      </div>
    </form>
  );
}

function validateProposalForm(form: ProposalFormState): Partial<Record<keyof ProposalFormState, string>> {
  const errors: Partial<Record<keyof ProposalFormState, string>> = {};
  if (!form.coverLetter.trim()) errors.coverLetter = "Proposal cover letter cannot be empty.";
  if (!form.proposedBudget.trim()) errors.proposedBudget = "Budget cannot be empty.";
  if (!form.estimatedDuration.trim()) errors.estimatedDuration = "Estimated duration cannot be empty.";
  return errors;
}

function Field({ children, error, label }: { children: ReactNode; error?: string; label: string }): JSX.Element {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
