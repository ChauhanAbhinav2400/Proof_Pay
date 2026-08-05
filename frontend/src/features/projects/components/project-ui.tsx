import { CalendarDays, CircleDollarSign, Clock, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/button";
import { Card } from "../../../components/card";
import type { Project } from "../../../types/domain";
import { formatWalletAddress } from "../../../utils/wallet";

export function StatusBadge({ status }: { status: string }): JSX.Element {
  const colors: Record<string, string> = {
    OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    ESCROW_CREATED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    WAITING: "bg-slate-100 text-slate-600 ring-slate-200",
    ACTIVE: "bg-blue-50 text-blue-700 ring-blue-200",
    SUBMITTED: "bg-amber-50 text-amber-700 ring-amber-200",
    APPROVED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    RELEASED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    DISPUTED: "bg-red-50 text-red-700 ring-red-200",
    ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    REJECTED: "bg-red-50 text-red-700 ring-red-200",
    WITHDRAWN: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs  font-semibold ring-1 ${colors[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}
    >
      {status}
    </span>
  );
}

export function ProjectCard({ project }: { project: Project }): JSX.Element {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            to={`/projects/${project.id}`}
            className="text-lg font-semibold text-slate-950 hover:text-indigo-700"
          >
            {project.title}
          </Link>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {project.description}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <span className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
          <CircleDollarSign size={16} className="text-emerald-600" />
          {project.budget} {project.currency}
        </span>
        <span className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
          <Clock size={16} className="text-indigo-600" />
          {project.expectedDuration}
        </span>
        <span className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
          <UserRound size={16} className="text-slate-500" />
          {formatWalletAddress(project.clientWallet)}
        </span>
        <span className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
          <CalendarDays size={16} className="text-slate-500" />
          {formatDate(project.createdAt)}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {project.skills.map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
          >
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-5">
        <Link to={`/projects/${project.id}`}>
          <Button className="bg-slate-900 hover:bg-slate-800">
            View Details
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export function ProjectSkeleton(): JSX.Element {
  return (
    <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white" />
  );
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
