import { Card } from "../components/card";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { useAdminSummary } from "../features/admin/hooks/use-admin-summary";
import { formatDate } from "../features/projects/components/project-ui";
import { getApiErrorMessage } from "../utils/api-error";
import { formatMockUsdtAmount } from "../utils/token-format";

export function AdminDashboardPage(): JSX.Element {
  const summary = useAdminSummary();

  if (summary.isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-white" />;
  }

  if (summary.isError) {
    return <ErrorState message={getApiErrorMessage(summary.error, "Unable to load admin summary.")} />;
  }

  if (!summary.data) {
    return <EmptyState title="No admin data" description="The backend did not return summary data." />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Live operational summary from the backend.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Users" value={summary.data.users.total} />
        <Metric label="Total Projects" value={summary.data.projects.total} />
        <Metric label="Total Proposals" value={summary.data.proposals.total} />
        <Metric label="Total Escrows" value={summary.data.escrows.total} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Breakdown title="Projects" items={[
          ["Open", summary.data.projects.open],
          ["Cancelled", summary.data.projects.cancelled],
          ["Completed", summary.data.projects.completed]
        ]} />
        <Breakdown title="Proposals" items={[
          ["Pending", summary.data.proposals.pending],
          ["Accepted", summary.data.proposals.accepted],
          ["Rejected", summary.data.proposals.rejected]
        ]} />
        <Breakdown title="Escrows" items={[
          ["Pending", summary.data.escrows.pending],
          ["Active", summary.data.escrows.active],
          ["Completed", summary.data.escrows.completed],
          ["Disputed", summary.data.escrows.disputed],
          ["Cancelled", summary.data.escrows.cancelled]
        ]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <RecentList title="Recent Projects" items={summary.data.recentProjects.map((project) => ({
          id: project.id,
          title: project.title,
          meta: `${project.status} • ${formatDate(project.createdAt)}`
        }))} />
        <RecentList title="Recent Escrows" items={summary.data.recentEscrows.map((escrow) => ({
          id: escrow.blockchainEscrowId,
          title: `Escrow #${escrow.blockchainEscrowId}`,
          meta: `${escrow.status} • ${formatMockUsdtAmount(escrow.totalAmount)}`
        }))} />
        <RecentList title="Recent Disputes" items={summary.data.recentDisputes.map((escrow) => ({
          id: escrow.blockchainEscrowId,
          title: `Dispute #${escrow.blockchainEscrowId}`,
          meta: `${escrow.clientWallet} -> ${escrow.freelancerWallet}`
        }))} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </Card>
  );
}

function Breakdown({ items, title }: { title: string; items: [string, number][] }): JSX.Element {
  return (
    <Card>
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <dl className="mt-4 space-y-2 text-sm">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function RecentList({ items, title }: { title: string; items: { id: string; title: string; meta: string }[] }): JSX.Element {
  return (
    <Card>
      <h2 className="font-semibold text-slate-950">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No records yet.</p>
      ) : (
        <ul className="mt-4 space-y-3 text-sm">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="mt-1 break-all text-xs text-slate-500">{item.meta}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}