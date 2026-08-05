export function formatWalletAddress(address: string, visibleCharacters = 4): string {
  return `${address.slice(0, visibleCharacters + 2)}…${address.slice(-visibleCharacters)}`;
}

export async function copyWalletAddress(address: string): Promise<void> {
  await navigator.clipboard.writeText(address);
}
