import { HttpError } from '../../utils/httpError';
import { User } from '../users/user.model';
import { blockRepository } from './block.repository';

export const blockService = {
  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new HttpError(400, 'You cannot block yourself', 'CANNOT_BLOCK_SELF');
    }
    const userExists = await User.exists({
      _id: blockedId,
      isActive: true,
      isEmailVerified: true,
    });
    if (!userExists) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }
    await blockRepository.block(blockerId, blockedId);
    return { success: true };
  },

  async unblockUser(blockerId: string, blockedId: string) {
    await blockRepository.unblock(blockerId, blockedId);
    return { success: true };
  },
};