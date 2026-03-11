import {
  UserReferred as UserReferredEvent,
  ReferralRewardPaid as ReferralRewardPaidEvent,
  ReferralRewardPending as ReferralRewardPendingEvent,
  CampaignStarted as CampaignStartedEvent,
  CampaignBonusUpdated as CampaignBonusUpdatedEvent,
  CampaignEnded as CampaignEndedEvent,
  ReferralRewardsEnabledUpdated as ReferralRewardsEnabledUpdatedEvent,
  ReferralBonusUpdated as ReferralBonusUpdatedEvent,
  TokenSupportUpdated as TokenSupportUpdatedEvent,
  PersonalSavingsUpdated as PersonalSavingsUpdatedEvent,
  RelayerStatusUpdated as RelayerStatusUpdatedEvent,
} from "../generated/ReferralRewardsProxy/ReferralRewards";
import {
  UserReferred,
  ReferralRewardPaid,
  ReferralRewardPending,
} from "../generated/schema";
import {
  getOrCreateReferralSystem,
  getOrCreateReferralTokenSettings,
  createTransaction,
  getOrCreateUser,
} from "./utils";
import { BigInt, Address } from "@graphprotocol/graph-ts";

export function handleUserReferred(event: UserReferredEvent): void {
  const transaction = createTransaction(event);
  const userReferred = new UserReferred(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );

  const user = getOrCreateUser(event.params.newUser);
  const referrer = getOrCreateUser(event.params.referrer);

  user.referredBy = referrer.id;
  user.createdAt = event.params.timestamp;
  user.save();

  userReferred.user = user.id;
  userReferred.referrer = referrer.id;
  userReferred.transaction = transaction.id;
  userReferred.save();
}

export function handleReferralRewardPaid(event: ReferralRewardPaidEvent): void {
  const transaction = createTransaction(event);
  const referralRewardPaid = new ReferralRewardPaid(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );

  const referrer = getOrCreateUser(event.params.referrer);

  // If referee is not address zero, it's a new referral reward (either partial or full)
  if (event.params.referee.notEqual(Address.zero())) {
    const referee = getOrCreateUser(event.params.referee);
    if (!referee.isReferralProcessed) {
      referrer.referralCount = referrer.referralCount.plus(BigInt.fromI32(1));
      referee.isReferralProcessed = true;
    }

    let paidAmount = event.params.amount;
    let pendingForThisUser = referee.pendingRewardAmount;

    if (paidAmount.gt(pendingForThisUser)) {
      // We are paying more than was pending. The extra is newly earned.
      let extra = paidAmount.minus(pendingForThisUser);
      referrer.totalReferralRewardsEarned =
        referrer.totalReferralRewardsEarned.plus(extra);
    }

    // Clear the pending balances
    if (referrer.pendingRewardsEarned.ge(pendingForThisUser)) {
      referrer.pendingRewardsEarned =
        referrer.pendingRewardsEarned.minus(pendingForThisUser);
    } else {
      referrer.pendingRewardsEarned = BigInt.zero();
    }

    referee.isPaid = true;
    referee.pendingRewardAmount = BigInt.zero();
    referee.save();
  } else {
    // Generic payment (referee is address(0)) - used when processing old pending rewards
    let paidAmount = event.params.amount;
    let pending = referrer.pendingRewardsEarned;

    if (paidAmount.gt(pending)) {
      let extra = paidAmount.minus(pending);
      referrer.totalReferralRewardsEarned =
        referrer.totalReferralRewardsEarned.plus(extra);
      referrer.pendingRewardsEarned = BigInt.zero();
    } else {
      referrer.pendingRewardsEarned = pending.minus(paidAmount);
    }
  }

  referrer.save();

  const settings = getOrCreateReferralTokenSettings(event.params.token);
  settings.totalRewardsPaid = settings.totalRewardsPaid.plus(
    event.params.amount,
  );
  settings.save();

  referralRewardPaid.referrer = referrer.id;
  referralRewardPaid.referee = event.params.referee;
  referralRewardPaid.token = event.params.token;
  referralRewardPaid.rewardAmount = event.params.amount;
  referralRewardPaid.transaction = transaction.id;
  referralRewardPaid.save();
}

export function handleReferralRewardPending(
  event: ReferralRewardPendingEvent,
): void {
  const transaction = createTransaction(event);
  const referralRewardPending = new ReferralRewardPending(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );

  const referrer = getOrCreateUser(event.params.referrer);
  const referee = getOrCreateUser(event.params.referee);

  // Mark referral as processed if not already
  if (!referee.isReferralProcessed) {
    referrer.referralCount = referrer.referralCount.plus(BigInt.fromI32(1));
    referee.isReferralProcessed = true;
  }

  // Record specifically for this referee
  referee.pendingRewardAmount = event.params.amount;
  referee.save();

  // Increment earned rewards (it's pending, but it's earned)
  referrer.totalReferralRewardsEarned =
    referrer.totalReferralRewardsEarned.plus(event.params.amount);
  referrer.pendingRewardsEarned = referrer.pendingRewardsEarned.plus(
    event.params.amount,
  );
  referrer.save();

  referralRewardPending.referrer = referrer.id;
  referralRewardPending.referee = referee.id;
  referralRewardPending.token = event.params.token;
  referralRewardPending.amount = event.params.amount;
  referralRewardPending.transaction = transaction.id;
  referralRewardPending.save();
}

export function handleCampaignStarted(event: CampaignStartedEvent): void {
  const system = getOrCreateReferralSystem();
  system.campaignMode = true;
  system.campaignStartTime = event.params.startTime;
  system.campaignEndTime = event.params.endTime;
  system.save();
}

export function handleCampaignBonusUpdated(
  event: CampaignBonusUpdatedEvent,
): void {
  const settings = getOrCreateReferralTokenSettings(event.params.token);
  settings.campaignBonusAmount = event.params.bonusAmount;
  settings.save();
}

export function handleCampaignEnded(event: CampaignEndedEvent): void {
  const system = getOrCreateReferralSystem();
  system.campaignMode = false;
  system.save();
}

export function handleReferralRewardsEnabledUpdated(
  event: ReferralRewardsEnabledUpdatedEvent,
): void {
  const system = getOrCreateReferralSystem();
  system.rewardsEnabled = event.params.enabled;
  system.save();
}

export function handleReferralBonusUpdated(
  event: ReferralBonusUpdatedEvent,
): void {
  const settings = getOrCreateReferralTokenSettings(event.params.token);
  settings.bonusAmount = event.params.amount;
  settings.save();
}

export function handleTokenSupportUpdated(
  event: TokenSupportUpdatedEvent,
): void {
  const settings = getOrCreateReferralTokenSettings(event.params.token);
  settings.isSupported = event.params.status;
  settings.save();
}

export function handlePersonalSavingsUpdated(
  event: PersonalSavingsUpdatedEvent,
): void {
  const system = getOrCreateReferralSystem();
  system.personalSavingsContract = event.params.newContract;
  system.save();
}

export function handleRelayerStatusUpdated(
  event: RelayerStatusUpdatedEvent,
): void {
  // This could be tracked in a Relayer entity if needed,
  // but for now we just acknowledge the event exists.
}
