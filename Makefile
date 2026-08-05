# -----------------------------
# Network Configuration
# -----------------------------

ANVIL_RPC_URL := http://127.0.0.1:8545
SEPOLIA_RPC_URL := https://eth-sepolia.g.alchemy.com/v2/alch_7y17mdRiEkwC2O1_uXOZT

CONTRACTS_DIR := contracts
BACKEND_ABI_DIR := backend/abi

.PHONY: \
	build \
	test \
	deploy \
	deploy-anvil \
	deploy-sepolia \
	use-anvil \
	use-sepolia \
	use-production \
	export-abis \
	clean-deployments

# -----------------------------
# Build Contracts
# -----------------------------

build:
	cd $(CONTRACTS_DIR) && forge build

# -----------------------------
# Run Contract Tests
# -----------------------------

test:
	cd $(CONTRACTS_DIR) && forge test

# -----------------------------
# Default Deployment
# -----------------------------

deploy: deploy-anvil

# -----------------------------
# Select Backend Environment
# -----------------------------

# backend/.env is generated from one of these root-level templates.
use-anvil:
	cp .env.anvil backend/.env

use-sepolia:
	cp .env.sepolia backend/.env

use-production:
	cp .env.production backend/.env

# -----------------------------
# Local Anvil Deployment
# -----------------------------

deploy-anvil:
	cd $(CONTRACTS_DIR) && \
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url $(ANVIL_RPC_URL) \
		--broadcast
	$(MAKE) export-abis

# -----------------------------
# Sepolia Deployment
# -----------------------------

deploy-sepolia:
	cd $(CONTRACTS_DIR) && \
	if [ -n "$$ETHERSCAN_API_KEY" ]; then \
		forge script script/Deploy.s.sol:Deploy \
			--rpc-url $(SEPOLIA_RPC_URL) \
			--broadcast \
			--verify \
			--etherscan-api-key $$ETHERSCAN_API_KEY; \
	else \
		forge script script/Deploy.s.sol:Deploy \
			--rpc-url $(SEPOLIA_RPC_URL) \
			--broadcast; \
	fi
	$(MAKE) export-abis

# -----------------------------
# Export ABIs For Backend
# -----------------------------

export-abis:
	mkdir -p $(BACKEND_ABI_DIR)
	cd $(CONTRACTS_DIR) && \
	jq '.abi' out/MockUSDT.sol/MockUSDT.json > ../$(BACKEND_ABI_DIR)/MockUSDT.json
	cd $(CONTRACTS_DIR) && \
	jq '.abi' out/ProofPayEscrow.sol/ProofPayEscrow.json > ../$(BACKEND_ABI_DIR)/ProofPayEscrow.json

# -----------------------------
# Cleanup Deployment Artifacts
# -----------------------------

clean-deployments:
	rm -f deployments/anvil.json
	rm -f deployments/sepolia.json
