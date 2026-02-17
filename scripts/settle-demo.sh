#!/bin/bash
# =============================================================================
# LocalOracle - Settle Demo Market via CRE Workflow
# Runs the CRE workflow simulation with --broadcast to settle expired markets.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "============================================"
echo "  LocalOracle - CRE Settlement Demo"
echo "============================================"
echo ""

# Check for cre CLI
if ! command -v cre &> /dev/null; then
    echo "Error: 'cre' CLI not found."
    echo "Install: https://docs.chain.link/cre"
    exit 1
fi

# Check for .env in oracle-workflow
if [ ! -f "$PROJECT_ROOT/oracle-workflow/.env" ]; then
    echo "Error: oracle-workflow/.env not found"
    echo "Create it with:"
    echo "  CRE_ETH_PRIVATE_KEY=your_private_key"
    echo "  CRE_TARGET=staging-settings"
    exit 1
fi

# Check for config
if [ ! -f "$PROJECT_ROOT/oracle-workflow/config.staging.json" ]; then
    echo "Error: oracle-workflow/config.staging.json not found"
    echo "Copy from config.staging.example.json and fill in API keys"
    exit 1
fi

echo "Step 1: Check on-chain market status"
echo "------"

RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
CONTRACT="0x192403dE32d297e58f3CdbCADbfBfd2fd16ff2F2"

if command -v cast &> /dev/null; then
    NEXT_ID=$(cast call --rpc-url "$RPC_URL" "$CONTRACT" "nextMarketId()(uint256)")
    echo "  Total markets: $NEXT_ID"

    for (( i=0; i<NEXT_ID; i++ )); do
        MARKET=$(cast call --rpc-url "$RPC_URL" "$CONTRACT" "getMarket(uint256)((uint256,address,string,int256,int256,uint256,bool,bool,uint256,uint256))" "$i")
        echo "  Market #$i: $MARKET"
    done
else
    echo "  (cast not found, skipping market status check)"
fi

echo ""
echo "Step 2: Run CRE settlement workflow"
echo "------"
echo "Mode: simulation with --broadcast (live testnet transactions)"
echo ""

cd "$PROJECT_ROOT/oracle-workflow"

# Run CRE workflow
cre workflow simulate --settings staging-settings --broadcast

echo ""
echo "============================================"
echo "  Settlement complete!"
echo "============================================"
echo ""
echo "Check results on Etherscan:"
echo "  https://sepolia.etherscan.io/address/$CONTRACT#events"
