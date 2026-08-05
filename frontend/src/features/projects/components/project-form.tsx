import { useEffect, useState } from "react";
import { Button } from "../../../components/button";
import type { CreateProjectInput, Project } from "../../../types/domain";

interface ProjectFormProps {
  project?: Project;
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: (input: CreateProjectInput) => Promise<void>;
  onCancel?: () => void;
}

interface ProjectFormState {
  title: string;
  description: string;
  budget: string;
  currency: string;
  expectedDuration: string;
  skills: string;
}

const emptyState: ProjectFormState = {
  title: "",
  description: "",
  budget: "",
  currency: "USDT",
  expectedDuration: "",
  skills: ""
};

export function ProjectForm({ project, isSubmitting, submitLabel, onSubmit, onCancel }: ProjectFormProps): JSX.Element {
  const [form, setForm] = useState<ProjectFormState>(emptyState);
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormState, string>>>({});

  useEffect(() => {
    if (!project) return;
    setForm({
      title: project.title,
      description: project.description,
      budget: project.budget,
      currency: project.currency,
      expectedDuration: project.expectedDuration,
      skills: project.skills.join(", ")
    });
  }, [project]);

  const updateField = (field: keyof ProjectFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateProjectForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    await onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      budget: form.budget.trim(),
      currency: form.currency.trim(),
      expectedDuration: form.expectedDuration.trim(),
      skills: parseSkills(form.skills)
    });
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <Field label="Title" error={errors.title}>
        <input value={form.title} onChange={(event) => updateField("title", event.target.value)} className={inputClass} />
      </Field>
      <Field label="Description" error={errors.description}>
        <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} className={`${inputClass} min-h-32`} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Budget" error={errors.budget}>
          <input value={form.budget} onChange={(event) => updateField("budget", event.target.value)} className={inputClass} />
        </Field>
        <Field label="Currency" error={errors.currency}>
          <input value={form.currency} onChange={(event) => updateField("currency", event.target.value)} className={inputClass} />
        </Field>
        <Field label="Expected duration" error={errors.expectedDuration}>
          <input value={form.expectedDuration} onChange={(event) => updateField("expectedDuration", event.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Skills" hint="Separate skills with commas." error={errors.skills}>
        <input value={form.skills} onChange={(event) => updateField("skills", event.target.value)} className={inputClass} />
      </Field>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : submitLabel}</Button>
        {onCancel && <Button type="button" onClick={onCancel} className="bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</Button>}
      </div>
    </form>
  );
}

function validateProjectForm(form: ProjectFormState): Partial<Record<keyof ProjectFormState, string>> {
  const errors: Partial<Record<keyof ProjectFormState, string>> = {};
  if (form.title.trim().length < 3) errors.title = "Project title must be at least 3 characters.";
  if (form.description.trim().length < 10) errors.description = "Description must be at least 10 characters.";
  if (!form.budget.trim()) errors.budget = "Budget cannot be empty.";
  if (!form.currency.trim()) errors.currency = "Currency cannot be empty.";
  if (!form.expectedDuration.trim()) errors.expectedDuration = "Expected duration cannot be empty.";
  if (parseSkills(form.skills).length === 0) errors.skills = "Skills array cannot be empty.";
  return errors;
}

function parseSkills(value: string): string[] {
  return value.split(",").map((skill) => skill.trim()).filter(Boolean);
}

function Field({ children, error, hint, label }: { children: React.ReactNode; error?: string; hint?: string; label: string }): JSX.Element {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
