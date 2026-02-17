#!/bin/bash
# =============================================================================
# LocalOracle - Create Demo Market
# Creates a weather prediction market on Ethereum Sepolia for demo purposes.
# =============================================================================

set -euo pipefail

# Configuration
RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
CONTRACT="0x192403dE32d297e58f3CdbCADbfBfd2fd16ff2F2"

# Market parameters
QUESTION="${1:-Will it rain in Stockholm today?}"
LAT="${2:-59354800}"    # Stockholm lat * 1e6
LNG="${3:-18066200}"    # Stockholm lng * 1e6
DURATION="${4:-120}"    # Default: 2 minutes (for demo)

# Check for private key
if [ -z "${PRIVATE_KEY:-}" ]; then
    echo "Error: Set PRIVATE_KEY environment variable"
    echo "  export PRIVATE_KEY=0x..."
    exit 1
fi

# Check for cast (Foundry)
if ! command -v cast &> /dev/null; then
    echo "Error: 'cast' not found. Install Foundry: https://book.getfoundry.sh/"
    exit 1
fi

# Calculate end time
END_TIME=$(( $(date +%s) + DURATION ))

echo "============================================"
echo "  LocalOracle - Create Demo Market"
echo "============================================"
echo ""
echo "  Question:  $QUESTION"
echo "  Location:  $(echo "scale=6; $LAT / 1000000" | bc), $(echo "scale=6; $LNG / 1000000" | bc)"
echo "  Duration:  ${DURATION}s (ends at $(date -d @$END_TIME 2>/dev/null || date -r $END_TIME))"
echo "  Contract:  $CONTRACT"
echo "  Network:   Ethereum Sepolia"
echo ""

# Send transaction
echo "Sending createMarket transaction..."
TX_HASH=$(cast send \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    "$CONTRACT" \
    "createMarket(string,int256,int256,uint256)" \
    "$QUESTION" "$LAT" "$LNG" "$END_TIME")

echo ""
echo "Transaction sent!"
echo ""

# Read current market count
NEXT_ID=$(cast call --rpc-url "$RPC_URL" "$CONTRACT" "nextMarketId()(uint256)")
MARKET_ID=$((NEXT_ID - 1))

echo "  Market ID:   $MARKET_ID"
echo "  Etherscan:   https://sepolia.etherscan.io/address/$CONTRACT"
echo ""
echo "Market will expire in ${DURATION} seconds."
echo "Then run: ./scripts/settle-demo.sh"
