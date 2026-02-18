// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OracleGovernanceToken.sol";

/// @title  OracleParameterRegistry
/// @notice LOG token holders propose and vote on oracle parameters.
///         Parameters control which weather data sources are used, the
///         consensus threshold, settlement fee, and AI adjudication provider.
///
///         Parameters are scoped per-market (marketId > 0) or globally
///         (marketId = 0).  Market-specific params take precedence; if none
///         exist the global defaults are returned.
///
///         Governance rules:
///           • Proposer must hold ≥ 10,000 LOG.
///           • Voting period: 3 days.
///           • Quorum: 51 % of total LOG supply must participate.
///           • Pass condition: votesFor > votesAgainst.
contract OracleParameterRegistry {
    // ─── Types ───────────────────────────────────────────────────────────────

    struct OracleParams {
        string[] dataSources;       // e.g. ["openweathermap", "weatherapi", "smhi"]
        uint8    consensusThreshold; // 50-100 (percentage); 100 = all sources must agree
        uint16   settlementFee;      // basis points (50 = 0.5 %)
        string   aiProvider;         // "anthropic" | "openai"
    }

    /// @dev Proposal core data without the hasVoted mapping (for external returns).
    struct ProposalInfo {
        uint256    id;
        uint256    marketId;
        OracleParams params;
        string     description;
        address    proposer;
        uint256    votesFor;
        uint256    votesAgainst;
        uint256    endTime;
        bool       executed;
    }

    /// @dev Full storage representation — contains a mapping so cannot be
    ///      returned as memory; keep private and expose via getProposal().
    struct Proposal {
        uint256    id;
        uint256    marketId;
        OracleParams params;
        string     description;
        address    proposer;
        uint256    votesFor;
        uint256    votesAgainst;
        uint256    endTime;
        bool       executed;
        mapping(address => bool) hasVoted;
    }

    // ─── State ───────────────────────────────────────────────────────────────
    OracleGovernanceToken public governanceToken;

    uint256 public constant PROPOSAL_THRESHOLD = 10_000e18; // 10 K LOG
    uint256 public constant VOTING_PERIOD      = 3 days;
    uint256 public constant QUORUM_PERCENTAGE  = 51;        // % of total supply

    uint256 public nextProposalId;

    // Private: Proposal contains a mapping so cannot be exposed via auto-getter
    mapping(uint256 => Proposal)    private _proposals;
    mapping(uint256 => OracleParams) private _activeParams; // marketId => params

    // ─── Events ──────────────────────────────────────────────────────────────
    event ProposalCreated(uint256 indexed proposalId, uint256 marketId, address proposer);
    event Voted(uint256 indexed proposalId, address voter, bool support, uint256 votes);
    event ProposalExecuted(uint256 indexed proposalId);

    // ─── Errors ──────────────────────────────────────────────────────────────
    error InsufficientBalance();
    error InvalidThreshold();
    error VotingEnded();
    error VotingNotEnded();
    error AlreadyVoted();
    error NoVotingPower();
    error AlreadyExecuted();
    error QuorumNotReached();
    error ProposalRejected();

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(address _governanceToken) {
        governanceToken = OracleGovernanceToken(_governanceToken);

        // Seed global defaults (marketId = 0) without array literals
        OracleParams storage defaults = _activeParams[0];
        defaults.dataSources.push("openweathermap");
        defaults.dataSources.push("weatherapi");
        defaults.consensusThreshold = 100;  // both sources must agree
        defaults.settlementFee      = 50;   // 0.5 %
        defaults.aiProvider         = "anthropic";
    }

    // ─── Governance ──────────────────────────────────────────────────────────

    /// @notice Submit a parameter-change proposal.
    /// @param marketId           0 = global; > 0 = per-market override.
    /// @param dataSources        New ordered list of weather-data source IDs.
    /// @param consensusThreshold Percentage of sources that must agree (50-100).
    /// @param settlementFee      Fee in basis points charged on resolved markets.
    /// @param aiProvider         AI adjudication backend ("anthropic" | "openai").
    /// @param description        Human-readable rationale for the change.
    function proposeParameterChange(
        uint256 marketId,
        string[] calldata dataSources,
        uint8  consensusThreshold,
        uint16 settlementFee,
        string calldata aiProvider,
        string calldata description
    ) external returns (uint256 proposalId) {
        if (governanceToken.balanceOf(msg.sender) < PROPOSAL_THRESHOLD)
            revert InsufficientBalance();
        if (consensusThreshold < 50 || consensusThreshold > 100)
            revert InvalidThreshold();

        proposalId = nextProposalId++;
        Proposal storage p = _proposals[proposalId];

        p.id          = proposalId;
        p.marketId    = marketId;
        p.description = description;
        p.proposer    = msg.sender;
        p.endTime     = block.timestamp + VOTING_PERIOD;

        // Dynamic string arrays must be copied element-by-element in Solidity
        for (uint256 i = 0; i < dataSources.length; i++) {
            p.params.dataSources.push(dataSources[i]);
        }
        p.params.consensusThreshold = consensusThreshold;
        p.params.settlementFee      = settlementFee;
        p.params.aiProvider         = aiProvider;

        emit ProposalCreated(proposalId, marketId, msg.sender);
    }

    /// @notice Cast a vote on an open proposal.
    ///         Voting weight = LOG balance at the time of the call (no snapshot).
    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = _proposals[proposalId];
        if (block.timestamp >= p.endTime) revert VotingEnded();
        if (p.hasVoted[msg.sender])       revert AlreadyVoted();

        uint256 votes = governanceToken.balanceOf(msg.sender);
        if (votes == 0) revert NoVotingPower();

        if (support) {
            p.votesFor     += votes;
        } else {
            p.votesAgainst += votes;
        }
        p.hasVoted[msg.sender] = true;

        emit Voted(proposalId, msg.sender, support, votes);
    }

    /// @notice Execute a passed proposal after the voting period has ended.
    ///         Applies the proposed OracleParams to the relevant market slot.
    function executeProposal(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        if (block.timestamp < p.endTime)  revert VotingNotEnded();
        if (p.executed)                   revert AlreadyExecuted();

        uint256 totalVotes  = p.votesFor + p.votesAgainst;
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 quorum      = (totalSupply * QUORUM_PERCENTAGE) / 100;

        if (totalVotes < quorum)           revert QuorumNotReached();
        if (p.votesFor <= p.votesAgainst)  revert ProposalRejected();

        // Overwrite active params for the target market
        OracleParams storage target = _activeParams[p.marketId];
        delete target.dataSources; // reset dynamic array before re-populating
        for (uint256 i = 0; i < p.params.dataSources.length; i++) {
            target.dataSources.push(p.params.dataSources[i]);
        }
        target.consensusThreshold = p.params.consensusThreshold;
        target.settlementFee      = p.params.settlementFee;
        target.aiProvider         = p.params.aiProvider;

        p.executed = true;
        emit ProposalExecuted(proposalId);
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    /// @notice Returns active params for a market.
    ///         Falls back to global defaults (marketId = 0) if none are set.
    function getActiveParameters(uint256 marketId) external view returns (OracleParams memory) {
        if (_activeParams[marketId].dataSources.length > 0) {
            return _activeParams[marketId];
        }
        return _activeParams[0];
    }

    /// @notice Returns proposal header + params (excludes hasVoted mapping).
    function getProposal(uint256 proposalId) external view returns (ProposalInfo memory info) {
        Proposal storage p = _proposals[proposalId];
        info.id           = p.id;
        info.marketId     = p.marketId;
        info.params       = p.params;
        info.description  = p.description;
        info.proposer     = p.proposer;
        info.votesFor     = p.votesFor;
        info.votesAgainst = p.votesAgainst;
        info.endTime      = p.endTime;
        info.executed     = p.executed;
    }

    /// @notice Returns whether an address has already voted on a proposal.
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return _proposals[proposalId].hasVoted[voter];
    }
}
