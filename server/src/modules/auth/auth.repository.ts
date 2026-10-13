import type { Types } from 'mongoose';
import { AuthChallenge, type OtpPurpose } from './auth.model';
import { AuthSession } from './session.model';
import { User } from '../users/user.model';

export const authRepository = {
  findUserByEmail: (email: string) =>
    User.findOne({ email }).select('+passwordHash'),

  findUserById: (userId: string) => User.findById(userId),

  findUserByUsernameOrEmail: (username: string, email: string) =>
    User.findOne({ $or: [{ username }, { email }] }).select('_id username email'),

  createUser: (values: {
    username: string;
    email: string;
    passwordHash: string;
    displayName: string;
    isActive: boolean;
  }) => User.create(values),

  createChallenge: async (values: {
    email: string;
    userId: Types.ObjectId;
    purpose: OtpPurpose;
    otpHash: string;
    expiresAt: Date;
  }) =>
    AuthChallenge.findOneAndUpdate(
      { email: values.email, purpose: values.purpose },
      {
        $set: {
          userId: values.userId,
          otpHash: values.otpHash,
          expiresAt: values.expiresAt,
          attempts: 0,
          consumedAt: null,
        },
        $inc: { resendCount: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),

  findChallenge: (email: string, purpose: OtpPurpose) =>
    AuthChallenge.findOne({
      email,
      purpose,
      expiresAt: { $gt: new Date() },
      consumedAt: null,
      attempts: { $lt: 5 },
    }).select('+otpHash'),

  recordChallengeFailure: (challengeId: Types.ObjectId) =>
    AuthChallenge.updateOne(
      { _id: challengeId, consumedAt: null },
      [{ $set: { attempts: { $add: ['$attempts', 1] } } }],
    ),

  consumeChallenge: (challengeId: Types.ObjectId) =>
    AuthChallenge.findOneAndUpdate(
      {
        _id: challengeId,
        expiresAt: { $gt: new Date() },
        consumedAt: null,
        attempts: { $lt: 5 },
      },
      { $set: { consumedAt: new Date() } },
      { new: true },
    ),

  deleteChallenge: (email: string, purpose: OtpPurpose) =>
    AuthChallenge.deleteOne({ email, purpose }),

  updateUserVerified: (userId: Types.ObjectId) =>
    User.findOneAndUpdate(
      { _id: userId, isEmailVerified: false },
      { $set: { isEmailVerified: true, isActive: true } },
      { new: true },
    ),

  updatePassword: async (userId: Types.ObjectId, passwordHash: string) => {
    await User.updateOne({ _id: userId }, { $set: { passwordHash } });
    await AuthSession.deleteMany({ userId });
  },

  createSession: (
    userId: Types.ObjectId,
    refreshTokenHash: string,
    expiresAt: Date,
    sessionId: Types.ObjectId,
  ) => AuthSession.create({ _id: sessionId, userId, refreshTokenHash, expiresAt }),

  findSession: (sessionId: string) =>
    AuthSession.findById(sessionId).select('+refreshTokenHash'),

  rotateSession: (
    sessionId: string,
    previousHash: string,
    nextHash: string,
    expiresAt: Date,
  ) =>
    AuthSession.findOneAndUpdate(
      { _id: sessionId, refreshTokenHash: previousHash, expiresAt: { $gt: new Date() } },
      { $set: { refreshTokenHash: nextHash, expiresAt } },
      { new: true },
    ),

  deleteSession: (sessionId: string, refreshTokenHash?: string) =>
    AuthSession.deleteOne({
      _id: sessionId,
      ...(refreshTokenHash ? { refreshTokenHash } : {}),
    }),

  deleteUserSessions: (userId: Types.ObjectId) =>
    AuthSession.deleteMany({ userId }),
};