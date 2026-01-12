import { Bytes } from "@graphprotocol/graph-ts";
import {
  GoalContribution as GoalContributionEvent,
  GoalWithdrawn as GoalWithdrawnEvent,
  PersonalGoalCreated as PersonalGoalCreatedEvent,
  YieldDistributed as YieldDistributedEvent,
  VaultUpdated as VaultUpdatedEvent,
  TokenAdded as TokenAddedEvent,
  TokenRemoved as TokenRemovedEvent,
  PersonalSavingsV1
} from "../generated/PersonalSavingsProxy/PersonalSavingsV1";
import { GoalContribution, GoalWithdrawn, PersonalGoal, PersonalGoalCreated, YieldDistributed, VaultUpdated, TokenAdded, TokenRemoved } from "../generated/schema";
import { createTransaction, getOrCreateUser } from "./utils";

export function handlePersonalGoalCreated(
  event: PersonalGoalCreatedEvent
): void {
  const transaction = createTransaction(event);
  const user = getOrCreateUser(event.params.owner);

  // Create the immutable event record
  const personalGoalCreated = new PersonalGoalCreated(event.transaction.hash);
  personalGoalCreated.user = user.id;
  personalGoalCreated.goalId = event.params.goalId;
  personalGoalCreated.goalName = event.params.name;
  personalGoalCreated.goalAmount = event.params.amount;
  personalGoalCreated.currentAmount = event.params.currentAmount;
  personalGoalCreated.contributionAmount = event.params.currentAmount;
  personalGoalCreated.frequency = event.params.frequency;
  personalGoalCreated.deadline = event.params.deadline;
  personalGoalCreated.isActive = event.params.isActive;
  personalGoalCreated.token = event.params.token;
  personalGoalCreated.transaction = transaction.id;

  // Create the mutable goal state entity
  // Use composite key: user address + goalId for unique identification
  const goalEntityId = event.params.owner.toHex() + "-" + event.params.goalId.toString();
  const personalGoal = new PersonalGoal(Bytes.fromUTF8(goalEntityId));
  personalGoal.user = user.id;
  personalGoal.goalId = event.params.goalId;
  personalGoal.goalName = event.params.name;
  personalGoal.goalAmount = event.params.amount;
  personalGoal.currentAmount = event.params.currentAmount;
  personalGoal.contributionAmount = event.params.currentAmount;
  personalGoal.frequency = event.params.frequency;
  personalGoal.deadline = event.params.deadline;
  personalGoal.isActive = event.params.isActive;
  personalGoal.createdAt = event.block.timestamp;
  personalGoal.updatedAt = event.block.timestamp;
  personalGoal.token = event.params.token;

  // Fetch isYieldEnabled from contract
  const contract = PersonalSavingsV1.bind(event.address);
  const goalData = contract.try_personalGoals(event.params.goalId);
  if (!goalData.reverted) {
    personalGoal.isYieldEnabled = goalData.value.getIsYieldEnabled();
  } else {
    personalGoal.isYieldEnabled = false;
  }

  user.save();
  personalGoalCreated.save();
  personalGoal.save();
}

export function handleGoalContribution(event: GoalContributionEvent): void {
  const transaction = createTransaction(event);
  const user = getOrCreateUser(event.params.owner);

  // Create the event record
  const goalContribution = new GoalContribution(event.transaction.hash);
  goalContribution.user = user.id;
  goalContribution.amount = event.params.amount;
  goalContribution.goalId = event.params.goalId;
  goalContribution.token = event.params.token;
  goalContribution.transaction = transaction.id;

  // Update the goal state
  const goalEntityId = event.params.owner.toHex() + "-" + event.params.goalId.toString();
  const personalGoal = PersonalGoal.load(Bytes.fromUTF8(goalEntityId));
  if (personalGoal) {
    personalGoal.currentAmount = event.params.currentAmount;
    personalGoal.updatedAt = event.block.timestamp;
    personalGoal.save();
  }

  user.save();
  goalContribution.save();
}

export function handleGoalWithdrawn(event: GoalWithdrawnEvent): void {
  const transaction = createTransaction(event);
  const user = getOrCreateUser(event.params.owner);

  // Create the event record
  const goalWithdrawn = new GoalWithdrawn(event.transaction.hash);
  goalWithdrawn.user = user.id;
  goalWithdrawn.goalId = event.params.goalId;
  goalWithdrawn.amount = event.params.amount;
  goalWithdrawn.penalty = event.params.penalty;
  goalWithdrawn.token = event.params.token;
  goalWithdrawn.transaction = transaction.id;

  // Update the goal state
  const goalEntityId = event.params.owner.toHex() + "-" + event.params.goalId.toString();
  const personalGoal = PersonalGoal.load(Bytes.fromUTF8(goalEntityId));
  if (personalGoal) {
    // Check if goal is still active by contract call or currentAmount
    const contract = PersonalSavingsV1.bind(event.address);
    const goalData = contract.try_personalGoals(event.params.goalId);
    if (!goalData.reverted) {
      personalGoal.isActive = goalData.value.getIsActive();
      personalGoal.currentAmount = goalData.value.getCurrentAmount();
    } else {
      // Fallback
      personalGoal.currentAmount = personalGoal.currentAmount.minus(event.params.amount);
      if (personalGoal.currentAmount.isZero()) {
        personalGoal.isActive = false;
      }
    }
    personalGoal.updatedAt = event.block.timestamp;
    personalGoal.save();

    goalWithdrawn.isActive = personalGoal.isActive;
  } else {
    goalWithdrawn.isActive = false;
  }

  user.save();
  goalWithdrawn.save();
}

export function handleYieldDistributed(event: YieldDistributedEvent): void {
  const transaction = createTransaction(event);
  const user = getOrCreateUser(event.params.owner);

  const yieldDistributed = new YieldDistributed(event.transaction.hash);
  yieldDistributed.user = user.id;
  yieldDistributed.goalId = event.params.goalId;
  yieldDistributed.yieldAmount = event.params.yieldAmount;
  yieldDistributed.platformShare = event.params.platformShare;
  yieldDistributed.token = event.params.token;
  yieldDistributed.transaction = transaction.id;

  yieldDistributed.save();
}

export function handleVaultUpdated(event: VaultUpdatedEvent): void {
  const transaction = createTransaction(event);
  const id = event.transaction.hash.concatI32(event.logIndex.toI32());
  const vaultUpdated = new VaultUpdated(id);
  vaultUpdated.token = event.params.token;
  vaultUpdated.newVault = event.params.newVault;
  vaultUpdated.contractType = "PERSONAL";
  vaultUpdated.transaction = transaction.id;
  vaultUpdated.save();
}

export function handleTokenAdded(event: TokenAddedEvent): void {
  const transaction = createTransaction(event);
  const id = event.transaction.hash.concatI32(event.logIndex.toI32());
  const tokenAdded = new TokenAdded(id);
  tokenAdded.token = event.params.token;
  tokenAdded.contractType = "PERSONAL";
  tokenAdded.transaction = transaction.id;
  tokenAdded.save();
}

export function handleTokenRemoved(event: TokenRemovedEvent): void {
  const transaction = createTransaction(event);
  const id = event.transaction.hash.concatI32(event.logIndex.toI32());
  const tokenRemoved = new TokenRemoved(id);
  tokenRemoved.token = event.params.token;
  tokenRemoved.contractType = "PERSONAL";
  tokenRemoved.transaction = transaction.id;
  tokenRemoved.save();
}