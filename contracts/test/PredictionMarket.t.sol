// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PredictionMarket.sol";
import "../src/interfaces/IWorldID.sol";
import "../src/interfaces/IERC20.sol";

// ─── Mock WorldID (always passes verification) ──────────────────────────
contract MockWorldID is IWorldID {
    function verifyProof(
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256[8] calldata
    ) external pure {}
}

// ─── Mock ERC20 ─────────────────────────────────────────────────────────
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

    function allowance(address owner_, address spender) external view returns (uint256) {
        return _allowances[owner_][spender];
    }

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

// ─── Tests ──────────────────────────────────────────────────────────────
contract PredictionMarketTest is Test {
    PredictionMarket public pm;
    MockWorldID public worldId;
    MockERC20 public usdc;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    uint256 public constant NULLIFIER_ALICE = 111;
    uint256 public constant NULLIFIER_BOB = 222;
    uint256[8] public dummyProof;

    function setUp() public {
        worldId = new MockWorldID();
        usdc = new MockERC20();
        pm = new PredictionMarket(address(worldId), address(usdc));

        // Fund users
        usdc.mint(alice, 1000e6);
        usdc.mint(bob, 1000e6);

        // Approve
        vm.prank(alice);
        usdc.approve(address(pm), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(pm), type(uint256).max);
    }

    function test_createMarket() public {
        uint256 id = pm.createMarket("Will it rain tomorrow?", 59356000, 18068000, block.timestamp + 1 days);
        assertEq(id, 0);

        PredictionMarket.Market memory m = pm.getMarket(0);
        assertEq(m.creator, address(this));
        assertEq(m.lat, 59356000);
        assertEq(m.lng, 18068000);
        assertFalse(m.resolved);
    }

    function test_placeBet() public {
        pm.createMarket("Test?", 0, 0, block.timestamp + 1 days);

        vm.prank(alice);
        pm.placeBet(0, true, 50e6, 0, NULLIFIER_ALICE, dummyProof);

        PredictionMarket.Market memory m = pm.getMarket(0);
        assertEq(m.totalYesStake, 50e6);
        assertEq(m.totalNoStake, 0);

        PredictionMarket.Position memory pos = pm.getPosition(0, NULLIFIER_ALICE);
        assertEq(pos.yesAmount, 50e6);
    }

    function test_stakeCapEnforced() public {
        pm.createMarket("Test?", 0, 0, block.timestamp + 1 days);

        vm.prank(alice);
        pm.placeBet(0, true, 100e6, 0, NULLIFIER_ALICE, dummyProof);

        vm.prank(alice);
        vm.expectRevert(PredictionMarket.StakeExceedsMax.selector);
        pm.placeBet(0, false, 1, 0, NULLIFIER_ALICE, dummyProof);
    }

    function test_resolveMarket_onlyOwnerOrOracle() public {
        pm.createMarket("Test?", 0, 0, block.timestamp + 1 days);

        // Warp past end time
        vm.warp(block.timestamp + 1 days + 1);

        // Non-owner cannot resolve
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.Unauthorized.selector);
        pm.resolveMarket(0, true);

        // Owner can resolve
        pm.resolveMarket(0, true);
        PredictionMarket.Market memory m = pm.getMarket(0);
        assertTrue(m.resolved);
        assertTrue(m.outcome);
    }

    function test_cannotResolveTwice() public {
        pm.createMarket("Test?", 0, 0, block.timestamp + 1 days);
        vm.warp(block.timestamp + 1 days + 1);
        pm.resolveMarket(0, true);

        vm.expectRevert(PredictionMarket.MarketAlreadyResolved.selector);
        pm.resolveMarket(0, false);
    }

    function test_cannotResolveBeforeEnd() public {
        pm.createMarket("Test?", 0, 0, block.timestamp + 1 days);

        vm.expectRevert(PredictionMarket.MarketNotEnded.selector);
        pm.resolveMarket(0, true);
    }

    function test_payoutMath() public {
        pm.createMarket("Test?", 0, 0, block.timestamp + 1 days);

        // Alice bets 60 YES, Bob bets 40 NO
        vm.prank(alice);
        pm.placeBet(0, true, 60e6, 0, NULLIFIER_ALICE, dummyProof);

        vm.prank(bob);
        pm.placeBet(0, false, 40e6, 0, NULLIFIER_BOB, dummyProof);

        // Resolve: YES wins
        vm.warp(block.timestamp + 1 days + 1);
        pm.resolveMarket(0, true);

        // Alice claims: 60 + (60 * 40 / 60) = 60 + 40 = 100
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        pm.claimPayout(0, NULLIFIER_ALICE);
        uint256 balAfter = usdc.balanceOf(alice);
        assertEq(balAfter - balBefore, 100e6);
    }

    function test_cannotClaimTwice() public {
        pm.createMarket("Test?", 0, 0, block.timestamp + 1 days);

        vm.prank(alice);
        pm.placeBet(0, true, 50e6, 0, NULLIFIER_ALICE, dummyProof);

        vm.warp(block.timestamp + 1 days + 1);
        pm.resolveMarket(0, true);

        vm.prank(alice);
        pm.claimPayout(0, NULLIFIER_ALICE);

        vm.prank(alice);
        vm.expectRevert(PredictionMarket.AlreadyClaimed.selector);
        pm.claimPayout(0, NULLIFIER_ALICE);
    }

    function test_loserCannotClaim() public {
        pm.createMarket("Test?", 0, 0, block.timestamp + 1 days);

        vm.prank(bob);
        pm.placeBet(0, false, 50e6, 0, NULLIFIER_BOB, dummyProof);

        vm.warp(block.timestamp + 1 days + 1);
        pm.resolveMarket(0, true); // YES wins, Bob bet NO

        vm.prank(bob);
        vm.expectRevert(PredictionMarket.NoPayout.selector);
        pm.claimPayout(0, NULLIFIER_BOB);
    }

    function test_setOracle() public {
        pm.setOracle(alice);
        assertEq(pm.oracle(), alice);

        // New oracle can resolve
        pm.createMarket("Test?", 0, 0, block.timestamp + 1 days);
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(alice);
        pm.resolveMarket(0, true);
    }

    function test_cannotBetAfterEnd() public {
        pm.createMarket("Test?", 0, 0, block.timestamp + 1 days);
        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(alice);
        vm.expectRevert(PredictionMarket.MarketEnded.selector);
        pm.placeBet(0, true, 50e6, 0, NULLIFIER_ALICE, dummyProof);
    }

    function test_cannotBetZero() public {
        pm.createMarket("Test?", 0, 0, block.timestamp + 1 days);

        vm.prank(alice);
        vm.expectRevert(PredictionMarket.ZeroAmount.selector);
        pm.placeBet(0, true, 0, 0, NULLIFIER_ALICE, dummyProof);
    }
}
