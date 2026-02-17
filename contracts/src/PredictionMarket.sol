// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IWorldID.sol";
import "./interfaces/IERC20.sol";

contract PredictionMarket {
    // ─── Types ───────────────────────────────────────────────────────────
    struct Market {
        uint256 id;
        address creator;
        string question;
        int256 lat;   // latitude * 1e6
        int256 lng;   // longitude * 1e6
        uint256 endTime;
        bool resolved;
        bool outcome; // true = YES won
        uint256 totalYesStake;
        uint256 totalNoStake;
    }

    struct Position {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    // ─── State ───────────────────────────────────────────────────────────
    IWorldID public immutable worldId;
    IERC20 public immutable usdc;
    address public owner;
    address public oracle;

    uint256 public nextMarketId;
    uint256 public constant MAX_STAKE_PER_HUMAN = 100e6; // 100 USDC (6 decimals)

    mapping(uint256 => Market) public markets;
    // marketId => nullifierHash => Position
    mapping(uint256 => mapping(uint256 => Position)) public positions;

    // ─── Events ──────────────────────────────────────────────────────────
    event MarketCreated(uint256 indexed marketId, address creator, string question, int256 lat, int256 lng, uint256 endTime);
    event BetPlaced(uint256 indexed marketId, uint256 nullifierHash, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event PayoutClaimed(uint256 indexed marketId, uint256 nullifierHash, uint256 amount);

    // ─── Errors ──────────────────────────────────────────────────────────
    error MarketDoesNotExist();
    error MarketAlreadyResolved();
    error MarketNotResolved();
    error MarketNotEnded();
    error MarketEnded();
    error StakeExceedsMax();
    error AlreadyClaimed();
    error NoPayout();
    error Unauthorized();
    error ZeroAmount();

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor(address _worldId, address _usdc) {
        worldId = IWorldID(_worldId);
        usdc = IERC20(_usdc);
        owner = msg.sender;
        oracle = msg.sender; // owner is oracle by default
    }

    // ─── Modifiers ───────────────────────────────────────────────────────
    modifier onlyOwnerOrOracle() {
        if (msg.sender != owner && msg.sender != oracle) revert Unauthorized();
        _;
    }

    // ─── Market Management ───────────────────────────────────────────────
    function createMarket(
        string calldata question,
        int256 lat,
        int256 lng,
        uint256 endTime
    ) external returns (uint256 marketId) {
        require(endTime > block.timestamp, "End time must be in the future");

        marketId = nextMarketId++;
        markets[marketId] = Market({
            id: marketId,
            creator: msg.sender,
            question: question,
            lat: lat,
            lng: lng,
            endTime: endTime,
            resolved: false,
            outcome: false,
            totalYesStake: 0,
            totalNoStake: 0
        });

        emit MarketCreated(marketId, msg.sender, question, lat, lng, endTime);
    }

    // ─── Betting (WorldID-verified) ──────────────────────────────────────
    function placeBet(
        uint256 marketId,
        bool isYes,
        uint256 amount,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        if (amount == 0) revert ZeroAmount();
        Market storage market = markets[marketId];
        if (market.endTime == 0) revert MarketDoesNotExist();
        if (market.resolved) revert MarketAlreadyResolved();
        if (block.timestamp >= market.endTime) revert MarketEnded();

        // Verify WorldID proof on-chain
        worldId.verifyProof(
            root,
            1, // groupId: Orb verification
            uint256(uint160(msg.sender)), // signal = wallet address
            nullifierHash,
            uint256(keccak256(abi.encodePacked("app_localoracle", "place-bet"))),
            proof
        );

        // Check stake cap per human per market
        Position storage pos = positions[marketId][nullifierHash];
        uint256 totalStake = pos.yesAmount + pos.noAmount + amount;
        if (totalStake > MAX_STAKE_PER_HUMAN) revert StakeExceedsMax();

        // Transfer USDC from user
        usdc.transferFrom(msg.sender, address(this), amount);

        // Update position and market totals
        if (isYes) {
            pos.yesAmount += amount;
            market.totalYesStake += amount;
        } else {
            pos.noAmount += amount;
            market.totalNoStake += amount;
        }

        emit BetPlaced(marketId, nullifierHash, isYes, amount);
    }

    // ─── Resolution ──────────────────────────────────────────────────────
    function resolveMarket(uint256 marketId, bool outcome) external onlyOwnerOrOracle {
        Market storage market = markets[marketId];
        if (market.endTime == 0) revert MarketDoesNotExist();
        if (market.resolved) revert MarketAlreadyResolved();
        if (block.timestamp < market.endTime) revert MarketNotEnded();

        market.resolved = true;
        market.outcome = outcome;

        emit MarketResolved(marketId, outcome);
    }

    // ─── Payouts ─────────────────────────────────────────────────────────
    function claimPayout(uint256 marketId, uint256 nullifierHash) external {
        Market storage market = markets[marketId];
        if (!market.resolved) revert MarketNotResolved();

        Position storage pos = positions[marketId][nullifierHash];
        if (pos.claimed) revert AlreadyClaimed();

        uint256 winnerStake = market.outcome ? pos.yesAmount : pos.noAmount;
        if (winnerStake == 0) revert NoPayout();

        uint256 totalWinPool = market.outcome ? market.totalYesStake : market.totalNoStake;
        uint256 totalLosePool = market.outcome ? market.totalNoStake : market.totalYesStake;

        // Payout = original stake + proportional share of losing pool
        uint256 payout = winnerStake + (winnerStake * totalLosePool / totalWinPool);

        pos.claimed = true;
        usdc.transfer(msg.sender, payout);

        emit PayoutClaimed(marketId, nullifierHash, payout);
    }

    // ─── View Functions ──────────────────────────────────────────────────
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getPosition(uint256 marketId, uint256 nullifierHash) external view returns (Position memory) {
        return positions[marketId][nullifierHash];
    }

    // ─── Admin ───────────────────────────────────────────────────────────
    function setOracle(address _oracle) external {
        if (msg.sender != owner) revert Unauthorized();
        oracle = _oracle;
    }
}
