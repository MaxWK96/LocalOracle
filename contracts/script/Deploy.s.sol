// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PredictionMarket.sol";
import "../src/interfaces/IWorldID.sol";
import "../src/interfaces/IERC20.sol";

// Mock WorldID that always passes verification (testnet only)
contract MockWorldID is IWorldID {
    function verifyProof(
        uint256, uint256, uint256, uint256, uint256, uint256[8] calldata
    ) external pure {}
}

// Mock USDC for testnet
contract MockERC20 is IERC20 {
    string public name = "Mock USDC";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function balanceOf(address account) external view returns (uint256) { return _balances[account]; }

    function transfer(address to, uint256 amount) external returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(address o, address s) external view returns (uint256) { return _allowances[o][s]; }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy mock contracts
        MockWorldID worldId = new MockWorldID();
        MockERC20 usdc = new MockERC20();

        // 2. Deploy PredictionMarket
        PredictionMarket market = new PredictionMarket(
            address(worldId),
            address(usdc)
        );

        // 3. Create a demo market: "Will it rain in Stockholm?" ending 2 minutes from now
        //    lat: 59.3293 * 1e6 = 59329300, lng: 18.0686 * 1e6 = 18068600
        market.createMarket(
            "Will it rain in Stockholm?",
            int256(59329300),
            int256(18068600),
            block.timestamp + 120 // expires in 2 minutes (for testing)
        );

        vm.stopBroadcast();

        // Log addresses
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("MockWorldID:", address(worldId));
        console.log("MockERC20 (USDC):", address(usdc));
        console.log("PredictionMarket:", address(market));
        console.log("");
        console.log("Demo market #0 created: 'Will it rain in Stockholm?'");
        console.log("  Expires in 2 minutes (for testing settlement)");
        console.log("");
        console.log("NEXT STEPS:");
        console.log("  1. Copy the PredictionMarket address to config.staging.json");
        console.log("  2. Call setOracle() with the CRE workflow address");
    }
}
