import {
  ProfileCreated as ProfileCreatedEvent,
  ProfileUpdated as ProfileUpdatedEvent,
  ContactInfoUpdated as ContactInfoUpdatedEvent,
} from "../generated/UserProfileProxy/UserProfileV1"
import {
  ProfileCreated,
  ProfileUpdated,
  ContactInfoUpdated,
} from "../generated/schema";
import { createTransaction, getOrCreateUser } from "./utils";
import { BigInt } from "@graphprotocol/graph-ts";

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

