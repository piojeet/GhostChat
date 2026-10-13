import type { FilterQuery, UpdateQuery } from 'mongoose';
import { Call } from './call.model';
import type { CallDocumentShape, CallState } from './call.types';
import type { SafeFriendUser } from '../friends/friend.types';

const safeUserFields = '_id username displayName avatar';
export type PopulatedCall = Omit<CallDocumentShape, 'caller' | 'recipient'> & {
  caller: SafeFriendUser;
  recipient: SafeFriendUser;
};

export const callRepository = {
  create: async (values: Partial<CallDocumentShape>): Promise<PopulatedCall | null> => {
    const created = await Call.create(values);
    return Call.findById(created._id)
      .populate<{ caller: SafeFriendUser }>({ path: 'caller', select: safeUserFields })
      .populate<{ recipient: SafeFriendUser }>({ path: 'recipient', select: safeUserFields })
      .lean()
      .exec() as Promise<PopulatedCall | null>;
  },

  findById: (callId: string): Promise<PopulatedCall | null> =>
    Call.findById(callId)
      .populate<{ caller: SafeFriendUser }>({ path: 'caller', select: safeUserFields })
      .populate<{ recipient: SafeFriendUser }>({ path: 'recipient', select: safeUserFields })
      .lean()
      .exec() as Promise<PopulatedCall | null>,

  transition: (
    callId: string,
    states: CallState[],
    update: UpdateQuery<CallDocumentShape>,
  ): Promise<PopulatedCall | null> =>
    Call.findOneAndUpdate(
      { _id: callId, state: { $in: states } } as FilterQuery<CallDocumentShape>,
      update,
      { new: true },
    )
      .populate<{ caller: SafeFriendUser }>({ path: 'caller', select: safeUserFields })
      .populate<{ recipient: SafeFriendUser }>({ path: 'recipient', select: safeUserFields })
      .lean()
      .exec() as Promise<PopulatedCall | null>,

  findHistory: async (userId: string, skip: number, limit: number) => {
    const filter = { $or: [{ caller: userId }, { recipient: userId }] };
    return Promise.all([
      Call.find(filter)
        .populate<{ caller: SafeFriendUser }>({ path: 'caller', select: safeUserFields })
        .populate<{ recipient: SafeFriendUser }>({ path: 'recipient', select: safeUserFields })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as Promise<PopulatedCall[]>,
      Call.countDocuments(filter),
    ]);
  },

  findStaleRinging: (participantIds: string[], cutoff: Date) =>
    Call.find({
      state: 'ringing',
      ringingAt: { $lte: cutoff },
      activeParticipantIds: { $in: participantIds },
    })
      .select('_id')
      .lean(),

  findActiveForUser: (userId: string) =>
    Call.find({
      state: { $in: ['ringing', 'accepted', 'connected'] },
      activeParticipantIds: userId,
    })
      .populate<{ caller: SafeFriendUser }>({ path: 'caller', select: safeUserFields })
      .populate<{ recipient: SafeFriendUser }>({ path: 'recipient', select: safeUserFields })
      .lean()
      .exec() as Promise<PopulatedCall[]>,

  findAllActive: () =>
    Call.find({ state: { $in: ['ringing', 'accepted', 'connected'] } })
      .populate<{ caller: SafeFriendUser }>({ path: 'caller', select: safeUserFields })
      .populate<{ recipient: SafeFriendUser }>({ path: 'recipient', select: safeUserFields })
      .lean()
      .exec() as Promise<PopulatedCall[]>,
};