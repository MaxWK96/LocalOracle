// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OracleParameterRegistry.sol";
import "../src/OracleGovernanceToken.sol";

contract OracleParameterRegistryTest is Test {
    OracleGovernanceToken token;
    OracleParameterRegistry registry;

    address alice = address(0xA11CE); // 600 K LOG – can meet quorum alone
    address bob   = address(0xB0B);   // 10.1 K LOG – can propose but not solo-quorum
    address carol = address(0xCA401); // no tokens

    // Quorum = 51 % of 1 M = 510 000 LOG
    uint256 constant QUORUM = 510_000e18;

    function setUp() public {
        // Test contract is the deployer/owner
        token    = new OracleGovernanceToken();
        registry = new OracleParameterRegistry(address(token));

        // Distribute tokens from contract reserve
        token.withdrawReserve(600_000e18);
        token.transfer(alice, 600_000e18);

        token.withdrawReserve(10_100e18);
        token.transfer(bob, 10_100e18);
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    /// Submit a minimal proposal from alice and return its id.
    function _alicePropose(uint256 marketId) internal returns (uint256 id) {
        string[] memory sources = new string[](2);
        sources[0] = "openweathermap";
        sources[1] = "smhi";
        vm.prank(alice);
        id = registry.proposeParameterChange(
            marketId, sources, 67, 25, "openai", "Test proposal"
        );
    }

    // ─── 1. Default global params ─────────────────────────────────────────────
    function test_defaultGlobalParams() public view {
        OracleParameterRegistry.OracleParams memory p = registry.getActiveParameters(0);
        assertEq(p.dataSources.length, 2);
        assertEq(p.dataSources[0], "openweathermap");
        assertEq(p.dataSources[1], "weatherapi");
        assertEq(p.consensusThreshold, 100);
        assertEq(p.settlementFee, 50);
        assertEq(p.aiProvider, "anthropic");
    }

    // ─── 2. Unknown market falls back to global ───────────────────────────────
    function test_unknownMarket_fallsBackToGlobal() public view {
        OracleParameterRegistry.OracleParams memory p = registry.getActiveParameters(999);
        assertEq(p.dataSources[0], "openweathermap");
        assertEq(p.consensusThreshold, 100);
    }

    // ─── 3. Proposal creation ─────────────────────────────────────────────────
    function test_proposeParameterChange() public {
        uint256 id = _alicePropose(0);
        assertEq(id, 0);
        assertEq(registry.nextProposalId(), 1);

        OracleParameterRegistry.ProposalInfo memory info = registry.getProposal(0);
        assertEq(info.id, 0);
        assertEq(info.marketId, 0);
        assertEq(info.proposer, alice);
        assertFalse(info.executed);
        assertEq(info.votesFor, 0);
        assertEq(info.votesAgainst, 0);
        assertEq(info.params.dataSources[1], "smhi");
        assertEq(info.params.consensusThreshold, 67);
        assertEq(info.params.settlementFee, 25);
        assertEq(info.params.aiProvider, "openai");
        assertEq(info.endTime, block.timestamp + 3 days);
    }

    // ─── 4. Proposal threshold enforced ──────────────────────────────────────
    function test_proposalThreshold_reverts() public {
        string[] memory sources = new string[](1);
        sources[0] = "weatherapi";
        vm.prank(carol); // carol has 0 LOG
        vm.expectRevert(OracleParameterRegistry.InsufficientBalance.selector);
        registry.proposeParameterChange(0, sources, 67, 25, "openai", "Poor carol");
    }

    // ─── 5. Invalid threshold value rejected ─────────────────────────────────
    function test_invalidConsensusThreshold_reverts() public {
        string[] memory sources = new string[](1);
        sources[0] = "weatherapi";
        vm.prank(alice);
        vm.expectRevert(OracleParameterRegistry.InvalidThreshold.selector);
        registry.proposeParameterChange(0, sources, 49, 25, "openai", "Below 50");
    }

    // ─── 6. Voting ────────────────────────────────────────────────────────────
    function test_vote_recordsCorrectly() public {
        uint256 id = _alicePropose(0);

        vm.prank(alice);
        registry.vote(id, true);

        OracleParameterRegistry.ProposalInfo memory info = registry.getProposal(id);
        assertEq(info.votesFor, token.balanceOf(alice));
        assertEq(info.votesAgainst, 0);
        assertTrue(registry.hasVoted(id, alice));
    }

    // ─── 7. Double-vote prevented ────────────────────────────────────────────
    function test_doubleVote_reverts() public {
        uint256 id = _alicePropose(0);

        vm.prank(alice);
        registry.vote(id, true);

        vm.prank(alice);
        vm.expectRevert(OracleParameterRegistry.AlreadyVoted.selector);
        registry.vote(id, false);
    }

    // ─── 8. Vote after deadline rejected ─────────────────────────────────────
    function test_voteAfterDeadline_reverts() public {
        uint256 id = _alicePropose(0);
        vm.warp(block.timestamp + 3 days + 1);

        vm.prank(alice);
        vm.expectRevert(OracleParameterRegistry.VotingEnded.selector);
        registry.vote(id, true);
    }

    // ─── 9. Execute before deadline rejected ─────────────────────────────────
    function test_executeBeforeDeadline_reverts() public {
        uint256 id = _alicePropose(0);
        vm.prank(alice);
        registry.vote(id, true);

        vm.expectRevert(OracleParameterRegistry.VotingNotEnded.selector);
        registry.executeProposal(id);
    }

    // ─── 10. Quorum not reached ───────────────────────────────────────────────
    function test_quorumNotReached_reverts() public {
        uint256 id = _alicePropose(0);

        // Bob casts 10,100 LOG – far below 510,000 quorum
        vm.prank(bob);
        registry.vote(id, true);

        vm.warp(block.timestamp + 3 days + 1);
        vm.expectRevert(OracleParameterRegistry.QuorumNotReached.selector);
        registry.executeProposal(id);
    }

    // ─── 11. Proposal rejected (against > for) ───────────────────────────────
    function test_proposalRejected_reverts() public {
        uint256 id = _alicePropose(0);

        // alice votes against her own proposal (enough for quorum, but no = wins)
        vm.prank(alice);
        registry.vote(id, false);

        vm.warp(block.timestamp + 3 days + 1);
        vm.expectRevert(OracleParameterRegistry.ProposalRejected.selector);
        registry.executeProposal(id);
    }

    // ─── 12. Successful execute updates global params ─────────────────────────
    function test_executeProposal_updatesGlobalParams() public {
        uint256 id = _alicePropose(0);

        vm.prank(alice);
        registry.vote(id, true); // 600 K LOG ≥ 510 K quorum

        vm.warp(block.timestamp + 3 days + 1);
        registry.executeProposal(id);

        OracleParameterRegistry.ProposalInfo memory info = registry.getProposal(id);
        assertTrue(info.executed);

        OracleParameterRegistry.OracleParams memory p = registry.getActiveParameters(0);
        assertEq(p.dataSources.length, 2);
        assertEq(p.dataSources[0], "openweathermap");
        assertEq(p.dataSources[1], "smhi");
        assertEq(p.consensusThreshold, 67);
        assertEq(p.settlementFee, 25);
        assertEq(p.aiProvider, "openai");
    }

    // ─── 13. Double-execute prevented ────────────────────────────────────────
    function test_doubleExecute_reverts() public {
        uint256 id = _alicePropose(0);
        vm.prank(alice);
        registry.vote(id, true);
        vm.warp(block.timestamp + 3 days + 1);
        registry.executeProposal(id);

        vm.expectRevert(OracleParameterRegistry.AlreadyExecuted.selector);
        registry.executeProposal(id);
    }

    // ─── 14. Market-specific params override global ───────────────────────────
    function test_marketSpecificParams_overrideGlobal() public {
        // Propose params only for market 42
        string[] memory sources = new string[](1);
        sources[0] = "smhi";
        vm.prank(alice);
        uint256 id = registry.proposeParameterChange(42, sources, 60, 100, "openai", "Market 42");

        vm.prank(alice);
        registry.vote(id, true);
        vm.warp(block.timestamp + 3 days + 1);
        registry.executeProposal(id);

        // Market 42 uses new params
        OracleParameterRegistry.OracleParams memory m42 = registry.getActiveParameters(42);
        assertEq(m42.dataSources.length, 1);
        assertEq(m42.dataSources[0], "smhi");
        assertEq(m42.consensusThreshold, 60);

        // Market 99 still falls back to global defaults
        OracleParameterRegistry.OracleParams memory m99 = registry.getActiveParameters(99);
        assertEq(m99.dataSources[0], "openweathermap");
        assertEq(m99.consensusThreshold, 100);
    }

    // ─── 15. Multiple voters can combine to reach quorum ─────────────────────
    function test_multipleVotersReachQuorum() public {
        // Withdraw the remaining reserve (1M − 600K − 10.1K = 389,900 LOG) to carol.
        // Combined: alice 600K + bob 10.1K + carol 389.9K = 1M > 510K quorum.
        uint256 remaining = token.balanceOf(address(token));
        token.withdrawReserve(remaining);
        token.transfer(carol, remaining);

        // bob: 10,100 LOG   carol: 400,000 LOG   combined: 410,100 – still short
        // add alice too: 600,000 + 10,100 + 400,000 = 1,010,100 – over quorum
        uint256 id = _alicePropose(0);

        vm.prank(alice);
        registry.vote(id, true);
        vm.prank(bob);
        registry.vote(id, true);
        vm.prank(carol);
        registry.vote(id, true);

        vm.warp(block.timestamp + 3 days + 1);
        registry.executeProposal(id); // must not revert

        assertTrue(registry.getProposal(id).executed);
    }
}
