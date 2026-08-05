import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/card";
import { WalletButton } from "../components/wallet-button";
import { useAuth } from "../hooks/use-auth";

export function LoginPage(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
      <Card>
        <Wallet className="mb-5 text-indigo-600" size={32} />
        <h1 className="text-2xl font-semibold text-slate-950">Welcome to ProofPay</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Connect your wallet to verify your identity and access your workspace.
        </p>
        <div className="mt-6">
          {isLoading ? <p className="text-sm text-slate-500">Verifying your wallet signature...</p> : <WalletButton />}
        </div>
      </Card>
    </motion.div>
  );
}
