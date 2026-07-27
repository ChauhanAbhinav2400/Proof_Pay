RPC_URL ?= https://eth-sepolia.g.alchemy.com/v2/alch_7y17mdRiEkwC2O1_uXOZT
CHAIN_ID ?= 11155111

CONTRACTS_DIR := contracts
BACKEND_ABI_DIR := backend/abi

.PHONY: build test deploy deploy-anvil deploy-sepolia export-abis clean-deployments

build:
	cd $(CONTRACTS_DIR) && forge build

test:
	cd $(CONTRACTS_DIR) && forge test

deploy: deploy-anvil

deploy-anvil:
	cd $(CONTRACTS_DIR) && forge script script/Deploy.s.sol:Deploy --rpc-url $(RPC_URL) --broadcast
	$(MAKE) export-abis

deploy-sepolia:
	cd $(CONTRACTS_DIR) && if [ -n "$$ETHERSCAN_API_KEY" ]; then forge script script/Deploy.s.sol:Deploy --rpc-url $(RPC_URL) --broadcast --verify --etherscan-api-key $$ETHERSCAN_API_KEY; else forge script script/Deploy.s.sol:Deploy --rpc-url $(RPC_URL) --broadcast; fi
	$(MAKE) export-abis

export-abis:
	mkdir -p $(BACKEND_ABI_DIR)
	cd $(CONTRACTS_DIR) && jq '.abi' out/MockUSDT.sol/MockUSDT.json > ../$(BACKEND_ABI_DIR)/MockUSDT.json
	cd $(CONTRACTS_DIR) && jq '.abi' out/ProofPayEscrow.sol/ProofPayEscrow.json > ../$(BACKEND_ABI_DIR)/ProofPayEscrow.json

clean-deployments:
	rm -f deployments/anvil.json deployments/sepolia.json
