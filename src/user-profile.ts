import {
  ProfileCreated as ProfileCreatedEvent,
  ProfileUpdated as ProfileUpdatedEvent,
  ContactInfoUpdated as ContactInfoUpdatedEvent,
  UserReferred as UserReferredEvent,
  ReferralRewardPaid as ReferralRewardPaidEvent,
  ReferralRewardsToggled as ReferralRewardsToggledEvent,
  ReferralBonusUpdated as ReferralBonusUpdatedEvent,
  CampaignStarted as CampaignStartedEvent,
  CampaignBonusUpdated as CampaignBonusUpdatedEvent,
  CampaignEnded as CampaignEndedEvent,
  TokenAdded as TokenAddedEvent,
  TokenRemoved as TokenRemovedEvent,
  PersonalSavingsContractUpdated as PersonalSavingsContractUpdatedEvent,
  ReferralRewardPending as ReferralRewardPendingEvent,
} from "../generated/UserProfileProxy/UserProfile"
import {
  ProfileCreated,
  ProfileUpdated,
  ContactInfoUpdated,
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
import { BigInt, store, Address } from "@graphprotocol/graph-ts";

export function handleProfileCreated(event: ProfileCreatedEvent): void {
  const transaction = createTransaction(event);
  const profileCreated = new ProfileCreated(event.transaction.hash);

  const user = getOrCreateUser(event.params.user);
  user.id = event.params.user;
  user.accountId = event.params.accountId;
  user.email = event.params.email;
  user.phoneNumber = event.params.phoneNumber;
  user.username = event.params.username;
  user.usernameLowercase = event.params.username.toLowerCase();
  user.fullName = event.params.fullName;
  user.photo = event.params.profilePhoto;
  user.createdAt = event.params.createdAt;
  user.hasProfile = event.params.hasProfile;
  

  // Set original contact info flags
  user.emailIsOriginal = event.params.email.length > 0;
  user.phoneIsOriginal = event.params.phoneNumber.length > 0;
  user.lastProfileUpdate = BigInt.fromI32(0);

  profileCreated.transaction = transaction.id;
  profileCreated.user = user.id

  user.save();
  profileCreated.save();
}

export function handleProfileUpdated(event: ProfileUpdatedEvent): void {
  const transaction = createTransaction(event);
  const profileUpdated = new ProfileUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  const user = getOrCreateUser(event.params.user);

  // Update full name and photo
  user.fullName = event.params.fullName;
  user.photo = event.params.photo;
  user.lastProfileUpdate = transaction.blockTimestamp;

  profileUpdated.transaction = transaction.id;
  profileUpdated.user = user.id;
  profileUpdated.fullName = event.params.fullName;
  profileUpdated.photo = event.params.photo;

  user.save();
  profileUpdated.save();
}

export function handleContactInfoUpdated(event: ContactInfoUpdatedEvent): void {
  const transaction = createTransaction(event);
  const contactInfoUpdated = new ContactInfoUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  const user = getOrCreateUser(event.params.user);

  // Update email and/or phone number
  user.email = event.params.email;
  user.phoneNumber = event.params.phoneNumber;
  user.lastProfileUpdate = transaction.blockTimestamp;

  contactInfoUpdated.transaction = transaction.id;
  contactInfoUpdated.user = user.id;
  contactInfoUpdated.email = event.params.email;
  contactInfoUpdated.phoneNumber = event.params.phoneNumber;

  user.save();
  contactInfoUpdated.save();
}

export function handleUserReferred(event: UserReferredEvent): void {
  const transaction = createTransaction(event);
  const userReferred = new UserReferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  const user = getOrCreateUser(event.params.newUser);
  const referrer = getOrCreateUser(event.params.referrer);

  user.referredBy = referrer.id;
  user.save();

  userReferred.user = user.id;
  userReferred.referrer = referrer.id;
  userReferred.transaction = transaction.id;
  userReferred.save();
}

export function handleReferralRewardPaid(event: ReferralRewardPaidEvent): void {
  const transaction = createTransaction(event);
  const referralRewardPaid = new ReferralRewardPaid(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  const referrer = getOrCreateUser(event.params.referrer);

  // If referee is not address zero, it's a new referral reward (either partial or full)
  if (event.params.referee.notEqual(Address.zero())) {
    const referee = getOrCreateUser(event.params.referee);
    if (!referee.isReferralProcessed) {
      referrer.referralCount = referrer.referralCount.plus(BigInt.fromI32(1));
      referee.isReferralProcessed = true;
      referee.save();
    }
    // Increment earned rewards
    referrer.totalReferralRewardsEarned = referrer.totalReferralRewardsEarned.plus(
      event.params.rewardAmount
    );
  }
  // If referee IS address zero, it means it's a payment for a previously pending reward
  // which was already added to totalReferralRewardsEarned when the ReferralRewardPending event fired.
  if (event.params.referee.equals(Address.zero())) {
    referrer.pendingRewardsEarned = referrer.pendingRewardsEarned.minus(
      event.params.rewardAmount
    );
  }

  referrer.save();

  const settings = getOrCreateReferralTokenSettings(event.params.token);
  settings.totalRewardsPaid = settings.totalRewardsPaid.plus(
    event.params.rewardAmount
  );
  settings.save();

  referralRewardPaid.referrer = referrer.id;
  referralRewardPaid.referee = event.params.referee;
  referralRewardPaid.token = event.params.token;
  referralRewardPaid.rewardAmount = event.params.rewardAmount;
  referralRewardPaid.transaction = transaction.id;
  referralRewardPaid.save();
}

export function handleReferralRewardPending(
  event: ReferralRewardPendingEvent
): void {
  const transaction = createTransaction(event);
  const referralRewardPending = new ReferralRewardPending(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  const referrer = getOrCreateUser(event.params.referrer);
  const referee = getOrCreateUser(event.params.referee);

  // Mark referral as processed if not already
  if (!referee.isReferralProcessed) {
    referrer.referralCount = referrer.referralCount.plus(BigInt.fromI32(1));
    referee.isReferralProcessed = true;
    referee.save();
  }

  // Increment earned rewards (it's pending, but it's earned)
  referrer.totalReferralRewardsEarned = referrer.totalReferralRewardsEarned.plus(
    event.params.amount
  );
  referrer.pendingRewardsEarned = referrer.pendingRewardsEarned.plus(
    event.params.amount
  );
  referrer.save();

  referralRewardPending.referrer = referrer.id;
  referralRewardPending.referee = referee.id;
  referralRewardPending.token = event.params.token;
  referralRewardPending.amount = event.params.amount;
  referralRewardPending.transaction = transaction.id;
  referralRewardPending.save();
}

export function handleReferralRewardsToggled(
  event: ReferralRewardsToggledEvent
): void {
  const system = getOrCreateReferralSystem();
  system.rewardsEnabled = event.params.enabled;
  system.save();
}

export function handleReferralBonusUpdated(
  event: ReferralBonusUpdatedEvent
): void {
  const settings = getOrCreateReferralTokenSettings(event.params.token);
  settings.bonusAmount = event.params.newAmount;
  settings.save();
}

export function handleCampaignStarted(event: CampaignStartedEvent): void {
  const system = getOrCreateReferralSystem();
  system.campaignMode = true;
  system.campaignStartTime = event.params.startTime;
  system.campaignEndTime = event.params.endTime;
  system.save();
}

export function handleCampaignBonusUpdated(
  event: CampaignBonusUpdatedEvent
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



export function handleTokenAdded(event: TokenAddedEvent): void {
  getOrCreateReferralTokenSettings(event.params.token);
}

export function handleTokenRemoved(event: TokenRemovedEvent): void {
  store.remove("ReferralTokenSettings", event.params.token.toHexString());
}

export function handlePersonalSavingsContractUpdated(
  event: PersonalSavingsContractUpdatedEvent
): void {
  const system = getOrCreateReferralSystem();
  system.personalSavingsContract = event.params.newContract;
  system.save();
}
