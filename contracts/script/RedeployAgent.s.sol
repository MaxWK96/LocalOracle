// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import "forge-std/Script.sol";
import "../src/MarketAgent.sol";
import "../src/PredictionMarket.sol";

contract RedeployAgent is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy new agent with Ownable
        MarketAgent agent = new MarketAgent(
            0x70B85F4dD99BBb914cE0ED905E54abF19Fc179Bd, // USDC
            0x59b5ff6AC21F763d00867Bd2b7b59381229Cb399, // PredictionMarket
            deployer // owner
        );
        
        console.log("=== NEW AGENT DEPLOYED ===");
        console.log("MarketAgent:", address(agent));
        console.log("Owner:", agent.owner());
        
        // Fund with 100 USDC via cast (do separately)
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Transfer 100 USDC to agent:");
        console.log("   cast send 0x70B85F4dD99BBb914cE0ED905E54abF19Fc179Bd \\");
        console.log("     'transfer(address,uint256)' \\");
        console.log("     ", address(agent), " \\");
        console.log("     100000000 \\");
        console.log("     --rpc-url https://ethereum-sepolia-rpc.publicnode.com \\");
        console.log("     --private-key $PRIVATE_KEY");
        console.log("");
        console.log("2. Register agent:");
        console.log("   cast send 0x59b5ff6AC21F763d00867Bd2b7b59381229Cb399 \\");
        console.log("     'registerAgent(address)' \\");
        console.log("     ", address(agent), " \\");
        console.log("     --rpc-url https://ethereum-sepolia-rpc.publicnode.com \\");
        console.log("     --private-key $PRIVATE_KEY");
        
        vm.stopBroadcast();
    }
}
