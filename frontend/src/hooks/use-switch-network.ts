import { useWallet } from "./use-wallet";

export function useSwitchNetwork() { const { switchNetwork, isWrongNetwork } = useWallet(); return { switchNetwork, isWrongNetwork }; }
