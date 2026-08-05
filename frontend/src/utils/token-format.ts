import { formatUnits } from "ethers";

const MOCK_USDT_DECIMALS = 6;

export function formatMockUsdtAmount(value: string | bigint | number): string {
  const formattedValue = formatUnits(value.toString(), MOCK_USDT_DECIMALS);
  const normalizedValue = formattedValue.replace(/\.?0+$/, "");

  return `${normalizedValue || "0"} USDT`;
}
