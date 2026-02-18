// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./PredictionMarket.sol";

/// @title  MarketAgent
/// @notice On-chain wallet for the LocalOracle autonomous AI agent.
///         The Chainlink CRE workflow is the only caller permitted to place
///         bets.  Risk controls enforce a 2 % bankroll cap per position and
///         a maximum of 5 simultaneously open bets.
///
///         Settlement is permissionless — anyone may call settleBet() after a
///         market resolves.  Losing bets are handled gracefully via try/catch
///         so a single failed claim never blocks the rest of the portfolio.
contract MarketAgent {
    // ─── State ───────────────────────────────────────────────────────────────
    IERC20           public usdc;
    PredictionMarket public market;
    address          public owner;
    address          public coreWorkflow; // Only CRE workflow can place bets

    uint256 public totalBets;
    uint256 public wins;
    uint256 public losses;
    int256  public totalPnL; // Cumulative profit / loss (can be negative)

    uint256 public constant MAX_BET_BPS    = 200; // 2 % of bankroll per bet
    uint256 public constant MAX_ACTIVE_BETS = 5;
    uint256 public activeBetCount;

    struct Bet {
        uint256 marketId;
        bool    outcome;    // YES (true) or NO (false)
        uint256 amount;     // USDC staked (6 decimals)
        uint256 timestamp;
        bool    settled;
        int256  pnl;        // Net profit/loss for this bet
        string  reasoning;  // AI rationale stored on-chain
    }

    Bet[]                       public bets;
    mapping(uint256 => uint256) public marketToBetIndex; // marketId => 1-indexed slot

    // ─── Events ──────────────────────────────────────────────────────────────
    event BetPlaced(uint256 indexed marketId, bool outcome, uint256 amount, string reasoning);
    event BetSettled(uint256 indexed marketId, int256 pnl);
    event WorkflowUpdated(address newWorkflow);

    // ─── Errors ──────────────────────────────────────────────────────────────
    error OnlyWorkflow();
    error OnlyOwner();
    error TooManyActiveBets();
    error AlreadyBetOnMarket();
    error BetExceedsRiskLimit();
    error NoBetOnMarket();
    error BetAlreadySettled();
    error InsufficientBalance();

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(address _usdc, address _market, address _owner) {
        usdc   = IERC20(_usdc);
        market = PredictionMarket(_market);
        owner  = _owner;
    }

    // ─── Modifiers ───────────────────────────────────────────────────────────
    modifier onlyWorkflow() {
        if (msg.sender != coreWorkflow) revert OnlyWorkflow();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // ─── Admin ───────────────────────────────────────────────────────────────
    function setCoreWorkflow(address _workflow) external onlyOwner {
        coreWorkflow = _workflow;
        emit WorkflowUpdated(_workflow);
    }

    // ─── Betting ─────────────────────────────────────────────────────────────

    /// @notice Place an autonomous bet.  Only the registered CRE workflow may
    ///         call this.
    /// @param marketId  Target prediction market.
    /// @param outcome   true = bet YES, false = bet NO.
    /// @param amount    USDC amount (6 decimals); must be ≤ 2 % of bankroll.
    /// @param reasoning Human-readable AI rationale stored on-chain.
    /// @return index    0-indexed position in the bets array.
    function placeBet(
        uint256 marketId,
        bool    outcome,
        uint256 amount,
        string calldata reasoning
    ) external onlyWorkflow returns (uint256 index) {
        if (activeBetCount >= MAX_ACTIVE_BETS) revert TooManyActiveBets();
        if (marketToBetIndex[marketId] != 0)   revert AlreadyBetOnMarket();

        uint256 bankroll = usdc.balanceOf(address(this));
        uint256 maxBet   = (bankroll * MAX_BET_BPS) / 10_000;
        if (amount > maxBet) revert BetExceedsRiskLimit();

        // Approve market to pull USDC, then forward to agent-specific entry point
        usdc.approve(address(market), amount);
        market.placeBetAgent(marketId, outcome, amount);

        bets.push(Bet({
            marketId:  marketId,
            outcome:   outcome,
            amount:    amount,
            timestamp: block.timestamp,
            settled:   false,
            pnl:       0,
            reasoning: reasoning
        }));

        marketToBetIndex[marketId] = bets.length; // 1-indexed; 0 = "no bet"
        activeBetCount++;
        totalBets++;

        emit BetPlaced(marketId, outcome, amount, reasoning);
        return bets.length - 1;
    }

    // ─── Settlement ──────────────────────────────────────────────────────────

    /// @notice Settle a bet after its market has been resolved.
    ///         Permissionless — anyone may call to keep the portfolio healthy.
    ///         Losing bets are handled gracefully: claimPayout reverts with
    ///         NoPayout(), which is caught so the overall tx still succeeds.
    function settleBet(uint256 marketId) external {
        uint256 betIndex = marketToBetIndex[marketId];
        if (betIndex == 0) revert NoBetOnMarket();

        Bet storage bet = bets[betIndex - 1];
        if (bet.settled) revert BetAlreadySettled();

        // Agent's nullifier is derived from its own address (set in placeBetAgent)
        uint256 nullifier     = uint256(uint160(address(this)));
        uint256 balanceBefore = usdc.balanceOf(address(this));
        int256  pnl;

        // claimPayout sends USDC to msg.sender (this contract) on a win.
        // On a loss it reverts with NoPayout() — catch and record the full loss.
        try market.claimPayout(marketId, nullifier) {
            uint256 balanceAfter = usdc.balanceOf(address(this));
            // pnl = payout_received - original_stake
            pnl = int256(balanceAfter - balanceBefore) - int256(bet.amount);
        } catch {
            pnl = -int256(bet.amount); // Entire stake was lost
        }

        bet.pnl     = pnl;
        bet.settled = true;
        activeBetCount--;
        totalPnL += pnl;

        if (pnl > 0) { wins++;   }
        else         { losses++; }

        emit BetSettled(marketId, pnl);
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    function getBankroll() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function getBetCount() external view returns (uint256) {
        return bets.length;
    }

    function getBet(uint256 index) external view returns (
        uint256 marketId,
        bool    outcome,
        uint256 amount,
        uint256 timestamp,
        bool    settled,
        int256  pnl,
        string memory reasoning
    ) {
        require(index < bets.length, "Invalid index");
        Bet storage bet = bets[index];
        return (
            bet.marketId,
            bet.outcome,
            bet.amount,
            bet.timestamp,
            bet.settled,
            bet.pnl,
            bet.reasoning
        );
    }

    function getStats() external view returns (
        uint256 bankroll,
        uint256 _totalBets,
        uint256 _wins,
        uint256 _losses,
        int256  _totalPnL,
        uint256 _activeBets
    ) {
        return (
            usdc.balanceOf(address(this)),
            totalBets,
            wins,
            losses,
            totalPnL,
            activeBetCount
        );
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    function withdrawProfits(address to, uint256 amount) external onlyOwner {
        if (amount > usdc.balanceOf(address(this))) revert InsufficientBalance();
        usdc.transfer(to, amount);
    }
}
