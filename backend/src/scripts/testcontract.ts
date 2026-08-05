import { proofPayEscrowContract, mockUSDTContract } from "../config/contracts";

async function main() {
  console.log(await mockUSDTContract.name());

  console.log(await mockUSDTContract.symbol());
}

main().catch((error) => {
  console.error("Error occurred:", error);
});
