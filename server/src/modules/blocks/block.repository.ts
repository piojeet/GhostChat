import { Block } from './block.model';

export const blockRepository = {
  isBlockedBetween: (firstUserId: string, secondUserId: string) =>
    Block.exists({
      $or: [
        { blocker: firstUserId, blocked: secondUserId },
        { blocker: secondUserId, blocked: firstUserId },
      ],
    }),

  getBlockedUserIds: async (userId: string): Promise<string[]> => {
    const blocks = await Block.find({
      $or: [{ blocker: userId }, { blocked: userId }],
    })
      .select('blocker blocked')
      .lean();
    return blocks.map(block =>
      block.blocker.toString() === userId
        ? block.blocked.toString()
        : block.blocker.toString(),
    );
  },

  block: (blocker: string, blocked: string) =>
    Block.updateOne(
      { blocker, blocked },
      { $setOnInsert: { blocker, blocked } },
      { upsert: true },
    ),

  unblock: (blocker: string, blocked: string) =>
    Block.deleteOne({ blocker, blocked }),
};