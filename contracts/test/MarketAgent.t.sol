// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MarketAgent.sol";
import "../src/PredictionMarket.sol";
import "../src/interfaces/IWorldID.sol";
import "../src/interfaces/IERC20.sol";

// ─── Mocks (re-declared locally to keep the test file self-contained) ────────

contract MockWorldID is IWorldID {
    function verifyProof(
        uint256, uint256, uint256, uint256, uint256, uint256[8] calldata
    ) external pure {}
}

contract MockERC20 is IERC20 {
    string public name     = "Mock USDC";
    string public symbol   = "USDC";
    uint8  public decimals = 6;

    mapping(address => uint256)                     private _bal;
    mapping(address => mapping(address => uint256)) private _allow;
    uint256 private _supply;

    function mint(address to, uint256 amt) external {
        _bal[to] += amt; _supply += amt;
        emit Transfer(address(0), to, amt);
    }

    function totalSupply()              external view returns (uint256) { return _supply; }
    function balanceOf(address a)       external view returns (uint256) { return _bal[a]; }
    function allowance(address o, address s) external view returns (uint256) { return _allow[o][s]; }

    function approve(address s, uint256 a) external returns (bool) {
        _allow[msg.sender][s] = a; emit Approval(msg.sender, s, a); return true;
    }
    function transfer(address to, uint256 a) external returns (bool) {
        _bal[msg.sender] -= a; _bal[to] += a; emit Transfer(msg.sender, to, a); return true;
    }
    function transferFrom(address f, address t, uint256 a) external returns (bool) {
        _allow[f][msg.sender] -= a; _bal[f] -= a; _bal[t] += a;
        emit Transfer(f, t, a); return true;
    }
}

// ─── Test contract ────────────────────────────────────────────────────────────

contract MarketAgentTest is Test {
    MockWorldID      worldId;
    MockERC20        usdc;
    PredictionMarket pm;
    MarketAgent      agent;

    address alice = address(0xA11CE);
    uint256 constant NULLIFIER_ALICE = 0xA11CE;
    uint256[8] dummyProof;

    // Agent starts with 1 000 USDC → 2 % cap = 20 USDC per bet
    uint256 constant AGENT_BANKROLL = 1_000e6;
    uint256 constant MAX_BET        = 20e6; // 2 % of 1 000

    function setUp() public {
        worldId = new MockWorldID();
        usdc    = new MockERC20();
        pm      = new PredictionMarket(address(worldId), address(usdc));

        // Deploy agent; test contract is both owner AND coreWorkflow
        agent = new MarketAgent(address(usdc), address(pm), address(this));
        agent.setCoreWorkflow(address(this));

        // Register agent so it can call placeBetAgent()
        pm.registerAgent(address(agent));

        // Fund agent
        usdc.mint(address(agent), AGENT_BANKROLL);

        // Fund alice and approve PM
        usdc.mint(alice, 1_000e6);
        vm.prank(alice);
        usdc.approve(address(pm), type(uint256).max);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function _market() internal returns (uint256 id) {
        id = pm.createMarket("Will it rain?", 59356000, 18068000, block.timestamp + 1 days);
    }

    /// Place an agent bet and return (marketId, betIndex).
    function _agentBet(uint256 marketId, bool outcome, uint256 amount)
        internal returns (uint256)
    {
        return agent.placeBet(marketId, outcome, amount, "AI says so");
    }

    // ─── 1. Basic bet placement ───────────────────────────────────────────────
    function test_placeBet_recordsBet() public {
        uint256 mid = _market();
        uint256 idx = _agentBet(mid, true, MAX_BET);

        assertEq(idx, 0);
        assertEq(agent.getBetCount(), 1);
        assertEq(agent.totalBets(), 1);
        assertEq(agent.activeBetCount(), 1);

        (uint256 mId, bool outcome, uint256 amount,, bool settled, int256 pnl,) = agent.getBet(0);
        assertEq(mId, mid);
        assertTrue(outcome);
        assertEq(amount, MAX_BET);
        assertFalse(settled);
        assertEq(pnl, 0);
    }

    // ─── 2. Risk limit enforced ───────────────────────────────────────────────
    function test_placeBet_riskLimit_reverts() public {
        uint256 mid = _market();
        // 2 % of 1 000 USDC = 20 USDC; try 21 USDC
        vm.expectRevert(MarketAgent.BetExceedsRiskLimit.selector);
        agent.placeBet(mid, true, MAX_BET + 1, "Too big");
    }

    // ─── 3. Max 5 active bets ─────────────────────────────────────────────────
    function test_placeBet_maxActiveBets_reverts() public {
        // Place 5 bets on 5 distinct markets
        for (uint256 i = 0; i < 5; i++) {
            uint256 mid = _market();
            _agentBet(mid, true, 1e6); // 1 USDC each (well within 2 % limit)
        }
        assertEq(agent.activeBetCount(), 5);

        // 6th bet on a fresh market must revert
        uint256 extra = _market();
        vm.expectRevert(MarketAgent.TooManyActiveBets.selector);
        agent.placeBet(extra, true, 1e6, "Too many");
    }

    // ─── 4. Duplicate market rejected ────────────────────────────────────────
    function test_placeBet_duplicateMarket_reverts() public {
        uint256 mid = _market();
        _agentBet(mid, true, 1e6);

        vm.expectRevert(MarketAgent.AlreadyBetOnMarket.selector);
        agent.placeBet(mid, false, 1e6, "Duplicate");
    }

    // ─── 5. Only workflow can place bets ─────────────────────────────────────
    function test_placeBet_onlyWorkflow_reverts() public {
        uint256 mid = _market();
        vm.prank(alice);
        vm.expectRevert(MarketAgent.OnlyWorkflow.selector);
        agent.placeBet(mid, true, 1e6, "Not workflow");
    }

    // ─── 6. Win: PnL > 0 ─────────────────────────────────────────────────────
    function test_settleBet_win() public {
        uint256 mid = _market();
        _agentBet(mid, true, MAX_BET); // agent bets 20 YES

        // Alice takes opposite side: 40 NO
        vm.prank(alice);
        pm.placeBet(mid, false, 40e6, 0, NULLIFIER_ALICE, dummyProof);

        // Resolve: YES wins
        vm.warp(block.timestamp + 1 days + 1);
        pm.resolveMarket(mid, true);

        uint256 bankrollBefore = usdc.balanceOf(address(agent));
        agent.settleBet(mid);

        // Payout = 20 + 20*40/20 = 20 + 40 = 60 USDC
        // PnL    = 60 - 20 = 40 USDC
        (,,,, bool settled, int256 pnl,) = agent.getBet(0);
        assertTrue(settled);
        assertEq(pnl, int256(40e6));
        assertEq(usdc.balanceOf(address(agent)), bankrollBefore + 60e6);

        assertEq(agent.wins(),   1);
        assertEq(agent.losses(), 0);
        assertEq(agent.totalPnL(), int256(40e6));
        assertEq(agent.activeBetCount(), 0);
    }

    // ─── 7. Loss: PnL = -stake ────────────────────────────────────────────────
    function test_settleBet_loss() public {
        uint256 mid = _market();
        _agentBet(mid, true, MAX_BET); // agent bets 20 YES

        // Alice bets NO
        vm.prank(alice);
        pm.placeBet(mid, false, 40e6, 0, NULLIFIER_ALICE, dummyProof);

        // Resolve: NO wins (agent loses)
        vm.warp(block.timestamp + 1 days + 1);
        pm.resolveMarket(mid, false);

        uint256 bankrollBefore = usdc.balanceOf(address(agent));
        agent.settleBet(mid); // must NOT revert even though claimPayout would fail

        (,,,, bool settled, int256 pnl,) = agent.getBet(0);
        assertTrue(settled);
        assertEq(pnl, -int256(MAX_BET));
        assertEq(usdc.balanceOf(address(agent)), bankrollBefore); // no payout received

        assertEq(agent.wins(),    0);
        assertEq(agent.losses(),  1);
        assertEq(agent.totalPnL(), -int256(MAX_BET));
        assertEq(agent.activeBetCount(), 0);
    }

    // ─── 8. Cannot settle twice ───────────────────────────────────────────────
    function test_settleBet_alreadySettled_reverts() public {
        uint256 mid = _market();
        _agentBet(mid, true, MAX_BET);

        vm.prank(alice);
        pm.placeBet(mid, false, 40e6, 0, NULLIFIER_ALICE, dummyProof);

        vm.warp(block.timestamp + 1 days + 1);
        pm.resolveMarket(mid, true);
        agent.settleBet(mid);

        vm.expectRevert(MarketAgent.BetAlreadySettled.selector);
        agent.settleBet(mid);
    }

    // ─── 9. settleBet reverts when no bet exists ──────────────────────────────
    function test_settleBet_noBet_reverts() public {
        vm.expectRevert(MarketAgent.NoBetOnMarket.selector);
        agent.settleBet(999);
    }

    // ─── 10. getStats reflects accurate portfolio state ───────────────────────
    function test_getStats_afterWinAndLoss() public {
        // Win on market A
        uint256 midA = _market();
        _agentBet(midA, true, MAX_BET);
        vm.prank(alice);
        pm.placeBet(midA, false, 40e6, 0, NULLIFIER_ALICE, dummyProof);
        vm.warp(block.timestamp + 1 days + 1);
        pm.resolveMarket(midA, true);
        agent.settleBet(midA);

        // Lose on market B (use a fresh timestamp so the market is in the future)
        vm.warp(block.timestamp + 1); // advance 1 second
        uint256 midB = pm.createMarket("Rain B?", 0, 0, block.timestamp + 1 days);
        _agentBet(midB, true, 10e6);
        vm.prank(alice);
        pm.placeBet(midB, false, 20e6, 0, NULLIFIER_ALICE + 1, dummyProof);
        vm.warp(block.timestamp + 1 days + 1);
        pm.resolveMarket(midB, false);
        agent.settleBet(midB);

        (uint256 bankroll, uint256 tb, uint256 w, uint256 l, int256 pnl, uint256 active)
            = agent.getStats();

        // Win: +40 USDC, Loss: -10 USDC → net +30 USDC
        assertEq(tb,     2);
        assertEq(w,      1);
        assertEq(l,      1);
        assertEq(pnl,    int256(30e6));
        assertEq(active, 0);
        // Bankroll started at 1 000, lost 20 stake (bet A), got 60 back (win),
        // lost 10 stake (bet B) → 1 000 - 20 + 60 - 10 = 1 030 USDC
        assertEq(bankroll, 1_030e6);
    }

    // ─── 11. withdrawProfits ──────────────────────────────────────────────────
    function test_withdrawProfits() public {
        uint256 before = usdc.balanceOf(address(this));
        agent.withdrawProfits(address(this), 100e6);
        assertEq(usdc.balanceOf(address(this)), before + 100e6);
        assertEq(usdc.balanceOf(address(agent)), AGENT_BANKROLL - 100e6);
    }

    // ─── 12. withdrawProfits only owner ──────────────────────────────────────
    function test_withdrawProfits_onlyOwner_reverts() public {
        vm.prank(alice);
        vm.expectRevert(MarketAgent.OnlyOwner.selector);
        agent.withdrawProfits(alice, 1e6);
    }
}
