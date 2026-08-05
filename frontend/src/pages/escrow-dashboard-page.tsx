import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { EscrowCard, EscrowSkeleton } from "../features/escrow/components/escrow-ui";
import { useEscrows } from "../features/escrow/hooks/use-escrows";
import { getApiErrorMessage } from "../utils/api-error";

export function EscrowDashboardPage(): JSX.Element {
  const escrows = useEscrows();

  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-950">Escrows</h1>
      <p className="mt-2 text-sm text-slate-600">Escrows returned by the authenticated backend escrow endpoint.</p>
      <div className="mt-6 space-y-4">
        {escrows.isLoading && Array.from({ length: 3 }, (_, index) => <EscrowSkeleton key={index} />)}
        {escrows.isError && <ErrorState message={getApiErrorMessage(escrows.error, "Unable to load escrows.")} />}
        {escrows.data?.length === 0 && <EmptyState title="No escrows" description="No escrow records are available for this authenticated wallet yet." />}
        {escrows.data?.map((escrow) => <EscrowCard key={escrow.blockchainEscrowId} escrow={escrow} />)}
      </div>
    </section>
  );
}
