import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
    VisibilityUpdated as VisibilityUpdatedEvent,
    CircleCreated as CircleCreatedEvent,
    CircleJoined as CircleJoinedEvent,
    CircleStarted as CircleStartedEvent,
    PayoutDistributed as PayoutDistributedEvent,
    PositionAssigned as PositionAssignedEvent,
    CollateralWithdrawn as CollateralWithdrawnEvent,
    VotingInitiated as VotingInitiatedEvent,
    VoteCast as VoteCastEvent,
    MemberInvited as MemberInvitedEvent,
    VoteExecuted as VoteExecutedEvent,
    ContributionMade as ContributionMadeEvent,
    LateContributionMade as LateContributionMadeEvent,
    MemberForfeited as MemberForfeitedEvent,
    CollateralReturned as CollateralReturnedEvent,
    DeadCircleFeeDeducted as DeadCircleFeeDeductedEvent,
    PointsAwarded as PointsAwardedEvent,
    YieldDistributed as YieldDistributedEvent,
    LateFeeAddedToPool as LateFeeAddedToPoolEvent,
    MemberRewardClaimed as MemberRewardClaimedEvent,
    VaultUpdated as VaultUpdatedEvent,
    TokenAdded as TokenAddedEvent,
    TokenRemoved as TokenRemovedEvent,
} from "../generated/CircleSavingsProxy/CircleSavingsV1"
import { Circle, CircleCreated, CircleJoined, CircleStarted, CollateralReturned, CollateralWithdrawn, ContributionMade, DeadCircleFeeDeducted, MemberForfeited, MemberInvited, PayoutDistributed, PositionAssigned, VisibilityUpdated, VoteCast, VoteExecuted, VotingInitiated, LateContributionMade, PointsAwarded, CircleYieldDistributed, LateFeeAddedToPool, MemberRewardClaimed, VaultUpdated, TokenAdded, TokenRemoved } from "../generated/schema";
import { CircleSavingsV1 } from "../generated/CircleSavingsProxy/CircleSavingsV1";
import { createTransaction, getOrCreateUser } from "./utils"

export function handleCircleCreated(event: CircleCreatedEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.creator);

    // Create the immutable event record (NO currentRound)
    const circleCreated = new CircleCreated(event.transaction.hash);
    circleCreated.user = user.id;
    circleCreated.circleId = event.params.circleId;
    circleCreated.circleName = event.params.title;
    circleCreated.circleDescription = event.params.description;
    circleCreated.circleContributionAmount = event.params.contributionAmount;
    circleCreated.collateralAmount = event.params.collateralLocked;
    circleCreated.circleFrequency = event.params.frequency;
    circleCreated.circleMaxMembers = event.params.maxMembers;
    circleCreated.circleVisibility = event.params.visibility;
    circleCreated.circleCreatedAt = event.params.createdAt;
    circleCreated.token = event.params.token;
    circleCreated.transaction = transaction.id;

    // Create the mutable Circle state entity
    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = new Circle(circleId);
    circle.circleId = event.params.circleId;
    circle.creator = user.id;
    circle.circleName = event.params.title;
    circle.circleDescription = event.params.description;
    circle.contributionAmount = event.params.contributionAmount;
    circle.collateralAmount = event.params.collateralLocked;
    circle.frequency = event.params.frequency;
    circle.maxMembers = event.params.maxMembers;
    circle.currentMembers = BigInt.fromI32(1);
    circle.currentRound = BigInt.fromI32(0);
    circle.visibility = event.params.visibility;
    circle.state = 1;
    circle.createdAt = event.params.createdAt;
    circle.startedAt = BigInt.fromI32(0);
    circle.updatedAt = event.block.timestamp;
    circle.token = event.params.token;
    circle.lateFeePool = BigInt.fromI32(0);
    circle.totalPoints = BigInt.fromI32(0);
    circle.totalPot = BigInt.fromI32(0);
    circle.contributionsThisRound = BigInt.fromI32(0);

    const contract = CircleSavingsV1.bind(event.address);
    const configResult = contract.try_circleConfigs(event.params.circleId);
    if (!configResult.reverted) {
        circle.isYieldEnabled = configResult.value.getIsYieldEnabled();
        circleCreated.isYieldEnabled = configResult.value.getIsYieldEnabled();
    } else {
        circle.isYieldEnabled = false;
        circleCreated.isYieldEnabled = false;
    }

    circleCreated.save();
    circle.save();
}

export function handleCircleJoined(event: CircleJoinedEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.member);

    // Create the immutable join event record
    const circleJoined = new CircleJoined(event.transaction.hash);
    circleJoined.circleId = event.params.circleId;

    circleJoined.user = user.id
    circleJoined.currentMembers = event.params.currentMembers;
    circleJoined.circleState = event.params.state;
    circleJoined.transaction = transaction.id;

    // Update the mutable Circle entity
    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        circle.currentMembers = event.params.currentMembers;
        circle.state = event.params.state;
        circle.updatedAt = event.block.timestamp;
        circle.save();
    }

    circleJoined.save();
}

export function handleCircleStarted(event: CircleStartedEvent): void {
    const transaction = createTransaction(event);

    // Create immutable event record
    const circleStarted = new CircleStarted(event.transaction.hash);
    circleStarted.circleId = event.params.circleId;
    circleStarted.circleStartedAt = event.params.startedAt;
    circleStarted.transaction = transaction.id;

    // Update the mutable Circle entity
    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        circle.state = event.params.state; // 1 = Active
        circle.currentRound = BigInt.fromI32(1); //  First round starts
        circle.startedAt = event.params.startedAt;
        circle.updatedAt = event.block.timestamp;
        circle.save();
    }

    circleStarted.save();
}

export function handlePayoutDistributed(event: PayoutDistributedEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.recipient);

    const payoutDistributed = new PayoutDistributed(event.transaction.hash);
    payoutDistributed.user = user.id;
    payoutDistributed.circleId = event.params.circleId;
    payoutDistributed.round = event.params.round;
    payoutDistributed.payoutAmount = event.params.amount
    payoutDistributed.token = event.params.token;
    payoutDistributed.transaction = transaction.id;

    // Increment the circle's currentRound
    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        // The contract increments round after payout ONLY if round < totalRounds (maxMembers)
        // If round == totalRounds, the circle is completed.
        if (event.params.round.lt(circle.maxMembers)) {
            circle.currentRound = event.params.round.plus(BigInt.fromI32(1));
        } else {
            // Circle is completed
            circle.state = 4; // CircleState.COMPLETED
            // Ensure currentRound reflects the final round (stays at maxMembers)
            circle.currentRound = circle.maxMembers;
        }
        circle.totalPot = BigInt.fromI32(0);
        circle.contributionsThisRound = BigInt.fromI32(0);
        circle.updatedAt = event.block.timestamp;
        circle.save();
    }

    payoutDistributed.save();
}

export function handlePositionAssigned(event: PositionAssignedEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.member);

    // Create unique ID: txHash + logIndex + member
    const id = event.transaction.hash
        .concatI32(event.logIndex.toI32())
        .concat(event.params.member);

    const positionAssigned = new PositionAssigned(id); // ✅ UNIQUE ID
    positionAssigned.user = user.id;
    positionAssigned.circleId = event.params.circleId;
    positionAssigned.position = event.params.position;
    positionAssigned.transaction = transaction.id;

    positionAssigned.save()
}

export function handleCollateralWithdrawn(event: CollateralWithdrawnEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.member);

    const collateralWithdrawn = new CollateralWithdrawn(event.transaction.hash);
    collateralWithdrawn.user = user.id;
    collateralWithdrawn.circleId = event.params.circleId;
    collateralWithdrawn.amount = event.params.amount;
    collateralWithdrawn.token = event.params.token;
    collateralWithdrawn.transaction = transaction.id;

    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        circle.state = 5; // DEAD
        circle.updatedAt = event.block.timestamp;
        circle.save();
    }

    collateralWithdrawn.save();
}

export function handleVotingInitiated(event: VotingInitiatedEvent): void {
    const transaction = createTransaction(event);

    const votingInitiated = new VotingInitiated(event.transaction.hash);
    votingInitiated.circleId = event.params.circleId;
    votingInitiated.votingStartAt = event.params.votingStartTime;
    votingInitiated.votingEndAt = event.params.votingEndTime;
    votingInitiated.transaction = transaction.id;

    // Update circle state to VOTING
    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        circle.state = 2; // VOTING
        circle.updatedAt = event.block.timestamp;
        circle.save();
    }

    votingInitiated.save();
}

export function handleVoteCast(event: VoteCastEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.voter)

    const voteCast = new VoteCast(event.transaction.hash);
    voteCast.voter = user.id;
    voteCast.circleId = event.params.circleId;
    voteCast.choice = event.params.choice;
    voteCast.transaction = transaction.id;

    voteCast.save();
}

export function handleMemberInvited(event: MemberInvitedEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.creator)

    const memberInvited = new MemberInvited(event.transaction.hash);
    memberInvited.inviter = user.id;
    memberInvited.invitee = event.params.invitee;
    memberInvited.circleId = event.params.circleId;
    memberInvited.invitedAt = event.params.invitedAt;
    memberInvited.transaction = transaction.id;

    memberInvited.save();
}

export function handleVoteExecuted(event: VoteExecutedEvent): void {
    const transaction = createTransaction(event);

    const voteExecuted = new VoteExecuted(event.transaction.hash);
    voteExecuted.circleId = event.params.circleId;
    voteExecuted.circleStarted = event.params.circleStarted;
    voteExecuted.startVoteTotal = event.params.startVoteCount;
    voteExecuted.withdrawVoteTotal = event.params.withdrawVoteCount;
    voteExecuted.transaction = transaction.id;

    // Calculate if withdraw won
    const totalVotes = event.params.startVoteCount.plus(event.params.withdrawVoteCount);
    const withdrawWon = totalVotes.gt(BigInt.fromI32(0))
        ? event.params.startVoteCount.times(BigInt.fromI32(10000)).div(totalVotes).lt(BigInt.fromI32(5100))
        : false;

    voteExecuted.withdrawWon = withdrawWon;

    // Update Circle entity state back to CREATED after vote
    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        circle.state = 1; // Back to CREATED after vote execution
        circle.updatedAt = event.block.timestamp;

        // Store vote result
        circle.voteWithdrawWon = withdrawWon;
        circle.lastVoteExecuted = voteExecuted.id;

        circle.save();
    }

    voteExecuted.save();
}

export function handleContributionMade(event: ContributionMadeEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.member)

    const contributionMade = new ContributionMade(event.transaction.hash);
    contributionMade.user = user.id;
    contributionMade.circleId = event.params.circleId;
    contributionMade.round = event.params.round
    contributionMade.amount = event.params.amount;
    contributionMade.token = event.params.token;
    contributionMade.transaction = transaction.id;

    contributionMade.save();

    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        circle.totalPot = circle.totalPot.plus(event.params.amount);
        circle.contributionsThisRound = circle.contributionsThisRound.plus(BigInt.fromI32(1));
        circle.updatedAt = event.block.timestamp;
        circle.save();
    }
}

export function handleMemberForfeited(event: MemberForfeitedEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.forfeiter)

    // Create unique ID: txHash + logIndex + forfeited member
    const id = event.transaction.hash
        .concatI32(event.logIndex.toI32())
        .concat(event.params.member);

    const memberForfeited = new MemberForfeited(id); // ✅ UNIQUE ID
    memberForfeited.forfeiter = user.id;
    memberForfeited.circleId = event.params.circleId;
    memberForfeited.round = event.params.round
    memberForfeited.deductionAmount = event.params.deduction;
    memberForfeited.forfeitedUser = event.params.member;
    memberForfeited.transaction = transaction.id;

    memberForfeited.save();

    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        const toPot = event.params.deduction.gt(circle.contributionAmount)
            ? circle.contributionAmount
            : event.params.deduction;

        circle.totalPot = circle.totalPot.plus(toPot);
        circle.contributionsThisRound = circle.contributionsThisRound.plus(BigInt.fromI32(1));
        circle.updatedAt = event.block.timestamp;
        circle.save();
    }
}

export function handleVisibilityUpdated(event: VisibilityUpdatedEvent): void {
    const transaction = createTransaction(event);

    // Create immutable event record
    const visibilityUpdated = new VisibilityUpdated(event.transaction.hash);
    visibilityUpdated.circleId = event.params.circleId;
    visibilityUpdated.transaction = transaction.id;

    // Update the mutable Circle entity using event data (no contract call!)
    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        circle.visibility = event.params.newVisibility;
        circle.updatedAt = event.block.timestamp;
        circle.save();
    }

    visibilityUpdated.save();
}

export function handleCollateralReturned(event: CollateralReturnedEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.member)

    // Create unique ID: txHash + member address + circleId
    const id = event.transaction.hash
        .concatI32(event.logIndex.toI32())
        .concat(event.params.member);

    const collateralReturned = new CollateralReturned(id); // ✅ UNIQUE ID
    collateralReturned.user = user.id;
    collateralReturned.circleId = event.params.circleId;
    collateralReturned.amount = event.params.amount;
    collateralReturned.token = event.params.token;
    collateralReturned.transaction = transaction.id;

    collateralReturned.save();
}

export function handleDeadCircleFeeDeducted(event: DeadCircleFeeDeductedEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.creator)

    const deadCircleFeeDeducted = new DeadCircleFeeDeducted(event.transaction.hash);
    deadCircleFeeDeducted.creator = event.params.creator;
    deadCircleFeeDeducted.circleId = event.params.circleId;
    deadCircleFeeDeducted.deadFee = event.params.amount;
    deadCircleFeeDeducted.transaction = transaction.id;

    deadCircleFeeDeducted.save();
}

export function handleLateContributionMade(event: LateContributionMadeEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.member);

    const lateContributionMade = new LateContributionMade(event.transaction.hash);
    lateContributionMade.user = user.id;
    lateContributionMade.circleId = event.params.circleId;
    lateContributionMade.round = event.params.round;
    lateContributionMade.amount = event.params.amount;
    lateContributionMade.fee = event.params.fee;
    lateContributionMade.token = event.params.token;
    lateContributionMade.transaction = transaction.id;

    lateContributionMade.save();

    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        circle.totalPot = circle.totalPot.plus(event.params.amount);
        circle.contributionsThisRound = circle.contributionsThisRound.plus(BigInt.fromI32(1));
        circle.updatedAt = event.block.timestamp;
        circle.save();
    }
}

export function handlePointsAwarded(event: PointsAwardedEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.member);

    const id = event.transaction.hash.concatI32(event.logIndex.toI32());
    const pointsAwarded = new PointsAwarded(id);
    pointsAwarded.user = user.id;
    pointsAwarded.circleId = event.params.circleId;
    pointsAwarded.points = event.params.points;
    pointsAwarded.reason = event.params.reason;
    pointsAwarded.transaction = transaction.id;

    // Update Circle total points
    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        circle.totalPoints = circle.totalPoints.plus(event.params.points);
        circle.updatedAt = event.block.timestamp;
        circle.save();
    }

    pointsAwarded.save();
}

export function handleYieldDistributed(event: YieldDistributedEvent): void {
    const transaction = createTransaction(event);

    const yieldDistributed = new CircleYieldDistributed(event.transaction.hash);
    yieldDistributed.circleId = event.params.circleId;
    yieldDistributed.totalSurplus = event.params.totalSurplus;
    yieldDistributed.platformShare = event.params.platformShare;
    yieldDistributed.communityShare = event.params.communityShare;
    yieldDistributed.transaction = transaction.id;

    yieldDistributed.save();
}

export function handleLateFeeAddedToPool(event: LateFeeAddedToPoolEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.member);

    const id = event.transaction.hash.concatI32(event.logIndex.toI32());
    const lateFeeAddedToPool = new LateFeeAddedToPool(id);
    lateFeeAddedToPool.user = user.id;
    lateFeeAddedToPool.circleId = event.params.circleId;
    lateFeeAddedToPool.amount = event.params.amount;
    lateFeeAddedToPool.transaction = transaction.id;

    // Update Circle late fee pool
    const circleId = changetype<Bytes>(Bytes.fromBigInt(event.params.circleId));
    const circle = Circle.load(circleId);
    if (circle) {
        circle.lateFeePool = circle.lateFeePool.plus(event.params.amount);
        circle.updatedAt = event.block.timestamp;
        circle.save();
    }

    lateFeeAddedToPool.save();
}

export function handleMemberRewardClaimed(event: MemberRewardClaimedEvent): void {
    const transaction = createTransaction(event);
    const user = getOrCreateUser(event.params.member);

    const id = event.transaction.hash.concatI32(event.logIndex.toI32());
    const memberRewardClaimed = new MemberRewardClaimed(id);
    memberRewardClaimed.user = user.id;
    memberRewardClaimed.circleId = event.params.circleId;
    memberRewardClaimed.rewardAmount = event.params.rewardAmount;
    memberRewardClaimed.transaction = transaction.id;

    memberRewardClaimed.save();
}

export function handleVaultUpdated(event: VaultUpdatedEvent): void {
    const transaction = createTransaction(event);
    const id = event.transaction.hash.concatI32(event.logIndex.toI32());
    const vaultUpdated = new VaultUpdated(id);
    vaultUpdated.token = event.params.token;
    vaultUpdated.newVault = event.params.newVault;
    vaultUpdated.contractType = "CIRCLE";
    vaultUpdated.transaction = transaction.id;
    vaultUpdated.save();
}

export function handleTokenAdded(event: TokenAddedEvent): void {
    const transaction = createTransaction(event);
    const id = event.transaction.hash.concatI32(event.logIndex.toI32());
    const tokenAdded = new TokenAdded(id);
    tokenAdded.token = event.params.token;
    tokenAdded.contractType = "CIRCLE";
    tokenAdded.transaction = transaction.id;
    tokenAdded.save();
}

export function handleTokenRemoved(event: TokenRemovedEvent): void {
    const transaction = createTransaction(event);
    const id = event.transaction.hash.concatI32(event.logIndex.toI32());
    const tokenRemoved = new TokenRemoved(id);
    tokenRemoved.token = event.params.token;
    tokenRemoved.contractType = "CIRCLE";
    tokenRemoved.transaction = transaction.id;
    tokenRemoved.save();
}
