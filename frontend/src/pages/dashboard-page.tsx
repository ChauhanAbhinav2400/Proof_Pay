import { BadgeCheck, Blocks, Cable, CircleCheck, CircleX, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "../components/card";
import { useAuth } from "../hooks/use-auth";
import { useSocket } from "../contexts/socket-context";
import { useWallet } from "../hooks/use-wallet";

function ConnectionBadge({ label, connected }: { label: string; connected: boolean }): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
        connected
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-white text-slate-500 ring-slate-200"
      }`}
    >
      {connected ? <CircleCheck size={14} /> : <CircleX size={14} />}
      {label}
    </span>
  );
}

export function DashboardPage(): JSX.Element {
  const { user, wallet, isLoading } = useAuth();
  const { chainId, isConnected } = useWallet();
  const { isConnected: isSocketConnected } = useSocket();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/20 sm:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200">Wallet-secured workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Your ProofPay identity, realtime connection, and escrow-ready blockchain session in one place.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <ConnectionBadge label="Wallet Connected" connected={isConnected} />
          <ConnectionBadge label="Backend Connected" connected={!isLoading && Boolean(user)} />
          <ConnectionBadge label="Socket Connected" connected={isSocketConnected} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-indigo-600" />
            <h2 className="font-semibold">Wallet</h2>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <dt className="text-slate-500">Address</dt>
            <dd className="break-all rounded-2xl bg-slate-50 p-3 font-mono text-slate-900">{wallet ?? user?.walletAddress ?? "Not connected"}</dd>
            <dt className="text-slate-500">Connected chain</dt>
            <dd>{chainId ?? "Not connected"}</dd>
            <dt className="text-slate-500">Current network</dt>
            <dd>{chainId ? `Chain ${chainId}` : "Not available"}</dd>
          </dl>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <BadgeCheck size={18} className="text-indigo-600" />
            <h2 className="font-semibold">User Profile</h2>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <dt className="text-slate-500">User ID</dt>
            <dd className="break-all font-mono">{user?.id ?? "Loading..."}</dd>
            <dt className="text-slate-500">Permissions</dt>
            <dd className="flex flex-wrap gap-2">
              {user?.permissions.map((permission) => (
                <span key={permission} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                  {permission}
                </span>
              )) ?? "Loading..."}
            </dd>
            {user?.displayName && (
              <>
                <dt className="text-slate-500">Display name</dt>
                <dd>{user.displayName}</dd>
              </>
            )}
            {user?.email && (
              <>
                <dt className="text-slate-500">Email</dt>
                <dd>{user.email}</dd>
              </>
            )}
          </dl>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Cable size={18} className="text-indigo-600" />
            <h2 className="font-semibold">Backend</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">Backend status is verified from the authenticated user profile request.</p>
          <p className="mt-3 text-sm font-semibold text-slate-950">{user ? "Authenticated API connection established" : "Awaiting backend connection"}</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Blocks size={18} className="text-indigo-600" />
            <h2 className="font-semibold">Blockchain</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{chainId ? `Connected to chain ${chainId}.` : "Connect a wallet to view the active network."}</p>
          <p className="mt-3 text-xs text-slate-500">The backend does not currently expose a latest-block endpoint.</p>
        </Card>
      </div>
    </motion.div>
  );
}
