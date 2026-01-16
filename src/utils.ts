import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Transaction, User, ReferralSystem, ReferralTokenSettings, PersonalSavingsSystem, PersonalSavingsTokenSettings } from "../generated/schema";

export function createTransaction(event: ethereum.Event): Transaction {
  const transaction = new Transaction(event.transaction.hash);
  transaction.blockNumber = event.block.number;
  transaction.blockTimestamp = event.block.timestamp;
  transaction.transactionHash = event.transaction.hash;

  transaction.save();
  return transaction;
}

export function getOrCreateUser(address: Bytes): User {
  let user = User.load(address);

  if (user == null) {
    user = new User(address);
    user.id = address;
    user.email = "";
    user.phoneNumber = "";
    user.username = "";
    user.usernameLowercase = "";
    user.fullName = "";
    user.accountId = BigInt.fromI32(0);
    user.photo = "";
    user.emailIsOriginal = false;
    user.phoneIsOriginal = false;
    user.lastPhotoUpdate = BigInt.fromI32(0);
    user.lastProfileUpdate = BigInt.fromI32(0);
    user.createdAt = BigInt.fromI32(0);
    user.hasProfile = false;
    user.repCategory = 0;
    user.totalReputation = BigInt.fromI32(300);
    user.totalLatePayments = BigInt.fromI32(0);
    user.totalGoalsCompleted = BigInt.fromI32(0);
    user.totalCirclesCompleted = BigInt.fromI32(0);
    user.referralCount = BigInt.fromI32(0);
    user.totalReferralRewardsEarned = BigInt.fromI32(0);
    user.pendingRewardsEarned = BigInt.fromI32(0);
    user.isReferralProcessed = false;

    user.save();
  }

  return user as User;
}

export function getOrCreateReferralSystem(): ReferralSystem {
  let system = ReferralSystem.load(Bytes.fromUTF8("system"));

  if (system == null) {
    system = new ReferralSystem(Bytes.fromUTF8("system"));
    system.rewardsEnabled = false;
    system.campaignMode = false;
    system.personalSavingsContract = Bytes.empty();

    system.save();
  }

  return system as ReferralSystem;
}

export function getOrCreateReferralTokenSettings(token: Bytes): ReferralTokenSettings {
  let settings = ReferralTokenSettings.load(token);

  if (settings == null) {
    settings = new ReferralTokenSettings(token);
    settings.system = Bytes.fromUTF8("system");
    settings.token = token;
    settings.bonusAmount = BigInt.fromI32(0);
    settings.campaignBonusAmount = BigInt.fromI32(0);
    settings.totalRewardsPaid = BigInt.fromI32(0);

    settings.save();
  }

  return settings as ReferralTokenSettings;
}

export function getOrCreatePersonalSavingsSystem(): PersonalSavingsSystem {
  let system = PersonalSavingsSystem.load(Bytes.fromUTF8("system"));

  if (system == null) {
    system = new PersonalSavingsSystem(Bytes.fromUTF8("system"));
    system.treasury = Bytes.empty();
    system.reputationContract = Bytes.empty();

    system.save();
  }

  return system as PersonalSavingsSystem;
}

export function getOrCreatePersonalSavingsTokenSettings(token: Bytes): PersonalSavingsTokenSettings {
  let settings = PersonalSavingsTokenSettings.load(token);

  if (settings == null) {
    settings = new PersonalSavingsTokenSettings(token);
    settings.system = Bytes.fromUTF8("system");
    settings.token = token;
    settings.totalPlatformFees = BigInt.fromI32(0);

    settings.save();
  }

  return settings as PersonalSavingsTokenSettings;
}