// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title  OracleGovernanceToken
/// @notice ERC20 governance token for LocalOracle.
///
///         Holders vote on oracle parameters: weather-data sources, stake caps,
///         adjudication weights, and fee splits.
///
///         Total supply : 1,000,000 LOG (18 decimals), minted to this contract.
///         Distribution :
///           • Market creators receive `creatorReward` LOG on market creation.
///           • Participants receive 1 LOG per 1 USDC staked (capped at
///             `participantRewardCap`) when they claim a payout.
///
///         The `distributor` address (set to the PredictionMarket contract by the
///         owner) is the only account allowed to trigger reward transfers.
contract OracleGovernanceToken {
    // ─── ERC20 Storage ───────────────────────────────────────────────────────
    string  public constant name     = "LocalOracle Governance";
    string  public constant symbol   = "LOG";
    uint8   public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ─── Governance Parameters ───────────────────────────────────────────────
    address public owner;
    address public distributor; // PredictionMarket contract address

    uint256 public constant TOTAL_SUPPLY = 1_000_000e18; // 1 M LOG

    /// @notice Flat LOG reward per market created (default: 100 LOG).
    uint256 public creatorReward = 100e18;

    /// @notice Maximum LOG reward per payout claim (default: 100 LOG).
    ///         Actual amount scales 1 LOG per 1 USDC staked up to this cap.
    uint256 public participantRewardCap = 100e18;

    // ─── ERC20 Events ────────────────────────────────────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // ─── Governance Events ───────────────────────────────────────────────────
    event DistributorSet(address indexed distributor);
    event CreatorRewarded(address indexed creator, uint256 indexed marketId, uint256 amount);
    event ParticipantRewarded(address indexed participant, uint256 indexed marketId, uint256 amount);
    event RewardParamsUpdated(uint256 creatorReward, uint256 participantRewardCap);

    // ─── Errors ──────────────────────────────────────────────────────────────
    error Unauthorized();
    error InsufficientBalance();
    error InsufficientAllowance();
    error InsufficientRewardPool();
    error ZeroAddress();

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        // Entire supply held by this contract; distributed via reward calls.
        _mint(address(this), TOTAL_SUPPLY);
    }

    // ─── ERC20 Core ──────────────────────────────────────────────────────────
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert InsufficientAllowance();
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    // ─── Distribution ────────────────────────────────────────────────────────

    /// @notice Reward a market creator with a flat LOG grant.
    ///         Called by PredictionMarket inside createMarket().
    /// @param creator   Address of the market creator.
    /// @param marketId  ID of the newly created market (for event indexing).
    function rewardCreator(address creator, uint256 marketId) external onlyDistributor {
        uint256 amount = creatorReward;
        if (balanceOf[address(this)] < amount) revert InsufficientRewardPool();
        _transfer(address(this), creator, amount);
        emit CreatorRewarded(creator, marketId, amount);
    }

    /// @notice Reward a participant proportional to their winning stake.
    ///         Rate: 1 LOG per 1 USDC (6-decimal) staked, capped at
    ///         `participantRewardCap`.
    ///         Called by PredictionMarket inside claimPayout().
    /// @param participant  Address claiming the payout.
    /// @param marketId     Market the payout was claimed from.
    /// @param stakeAmount  Winning stake in USDC (6 decimals).
    function rewardParticipant(
        address participant,
        uint256 marketId,
        uint256 stakeAmount
    ) external onlyDistributor {
        // 1 LOG (1e18) per 1 USDC (1e6) → multiply by 1e12
        uint256 amount = stakeAmount * 1e12;
        if (amount > participantRewardCap) amount = participantRewardCap;
        if (amount == 0) amount = 1e18; // minimum 1 LOG for any participation
        if (balanceOf[address(this)] < amount) revert InsufficientRewardPool();
        _transfer(address(this), participant, amount);
        emit ParticipantRewarded(participant, marketId, amount);
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    /// @notice Designate the contract that may trigger reward distribution.
    ///         Should be set to the deployed PredictionMarket address.
    function setDistributor(address _distributor) external onlyOwner {
        if (_distributor == address(0)) revert ZeroAddress();
        distributor = _distributor;
        emit DistributorSet(_distributor);
    }

    /// @notice Adjust reward parameters (e.g. after governance vote off-chain).
    function setRewardParams(
        uint256 _creatorReward,
        uint256 _participantRewardCap
    ) external onlyOwner {
        creatorReward        = _creatorReward;
        participantRewardCap = _participantRewardCap;
        emit RewardParamsUpdated(_creatorReward, _participantRewardCap);
    }

    /// @notice Transfer unsold/reserve tokens to owner (e.g. for DAO treasury).
    function withdrawReserve(uint256 amount) external onlyOwner {
        _transfer(address(this), owner, amount);
    }

    // ─── Modifiers ───────────────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    /// @dev Owner can also call distribution functions directly (e.g. manual airdrops).
    modifier onlyDistributor() {
        if (msg.sender != distributor && msg.sender != owner) revert Unauthorized();
        _;
    }

    // ─── Internal ────────────────────────────────────────────────────────────
    function _transfer(address from, address to, uint256 amount) internal {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to]   += amount;
        }
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply       += amount;
        balanceOf[to]     += amount;
        emit Transfer(address(0), to, amount);
    }
}
