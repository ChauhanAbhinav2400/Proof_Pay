import { Link } from "react-router-dom";

import { Card } from "../components/card";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { useDisputedEscrows } from "../features/escrow/hooks/use-escrows";
import { formatDate, StatusBadge } from "../features/projects/components/project-ui";
import { getApiErrorMessage } from "../utils/api-error";
import { formatMockUsdtAmount } from "../utils/token-format";
import { formatWalletAddress } from "../utils/wallet";

export function ArbitratorDashboardPage(): JSX.Element {
  const disputedEscrows = useDisputedEscrows({ limit: 50 });

  if (disputedEscrows.isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-white" />;
  }

  if (disputedEscrows.isError) {
    return <ErrorState message={getApiErrorMessage(disputedEscrows.error, "Unable to load disputed escrows.")} />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Arbitrator Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Disputed escrows that require review.</p>
      </div>

      {disputedEscrows.data?.length === 0 && (
        <EmptyState title="No disputed escrows" description="There are no disputes waiting for arbitration." />
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {disputedEscrows.data?.map((escrow) => (
          <Card key={escrow.blockchainEscrowId}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Escrow #{escrow.blockchainEscrowId}</h2>
                <p className="mt-1 text-xs text-slate-500">Updated {formatDate(escrow.updatedAt)}</p>
              </div>
              <StatusBadge status={escrow.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Client" value={formatWalletAddress(escrow.clientWallet)} />
              <Detail label="Freelancer" value={formatWalletAddress(escrow.freelancerWallet)} />
              <Detail label="Total amount" value={formatMockUsdtAmount(escrow.totalAmount)} />
              <Detail label="Milestones" value={String(escrow.milestones.length)} />
            </dl>
            <Link to={`/escrows/${escrow.blockchainEscrowId}`} className="mt-4 inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-900">
              Review and resolve
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 break-all font-medium text-slate-900">{value}</dd>
    </div>
  );
}
