import { Types } from 'mongoose';
import { User } from '../users/user.model';
import { Friend } from '../friends/friend.model';
import { Message } from '../messages/message.model';
import { Conversation } from './chat.model';
import type { ConversationListRecord } from './chat.types';

type ConversationListAggregate = {
  items: ConversationListRecord[];
  total: { count: number }[];
};

export const chatRepository = {
  findByPairKey: (pairKey: string) =>
    Conversation.findOne({ participantPairKey: pairKey })
      .select('+participantPairKey')
      .lean(),

  create: (participantIds: [string, string], pairKey: string) =>
    Conversation.create({
      participants: participantIds,
      participantPairKey: pairKey,
    }),

  findForParticipant: (chatId: string, userId: string) =>
    Conversation.findOne({
      _id: chatId,
      participants: new Types.ObjectId(userId),
    }).lean(),

  listForParticipant: async (
    userId: string,
    hiddenUserIds: string[],
    skip: number,
    limit: number,
  ) => {
    const currentUser = new Types.ObjectId(userId);
    const hiddenUsers = hiddenUserIds.map(id => new Types.ObjectId(id));
    const [result] = await Friend.aggregate<ConversationListAggregate>([
      {
        $match: {
          status: 'accepted',
          $or: [
            { requester: currentUser, recipient: { $nin: hiddenUsers } },
            { recipient: currentUser, requester: { $nin: hiddenUsers } },
          ],
        },
      },
      {
        $addFields: {
          otherParticipant: {
            $cond: [{ $eq: ['$requester', currentUser] }, '$recipient', '$requester'],
          },
        },
      },
      {
        $lookup: {
          from: User.collection.name,
          localField: 'otherParticipant',
          foreignField: '_id',
          pipeline: [
            { $match: { isActive: true, isEmailVerified: true } },
            {
              $project: {
                _id: 1,
                username: 1,
                displayName: 1,
                avatar: 1,
                gender: 1,
              },
            },
          ],
          as: 'otherUser',
        },
      },
      { $unwind: '$otherUser' },
      {
        $lookup: {
          from: Conversation.collection.name,
          let: { otherParticipant: '$otherParticipant' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: [currentUser, '$participants'] },
                    { $in: ['$$otherParticipant', '$participants'] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: 'conversation',
        },
      },
      {
        $unwind: {
          path: '$conversation',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: Message.collection.name,
          let: { conversationId: '$conversation._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversation', '$$conversationId'] },
                    { $ne: ['$sender', currentUser] },
                    { $eq: ['$deletedAt', null] },
                  ],
                },
              },
            },
            { $unwind: '$receipts' },
            {
              $match: {
                'receipts.recipient': currentUser,
                'receipts.readAt': null,
              },
            },
            { $count: 'count' },
          ],
          as: 'unreadMessages',
        },
      },
      {
        $facet: {
          items: [
            {
              $addFields: {
                sortAt: {
                  $ifNull: [
                    '$conversation.lastMessage.sentAt',
                    { $ifNull: ['$acceptedAt', '$updatedAt'] },
                  ],
                },
              },
            },
            { $sort: { sortAt: -1, _id: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: { $ifNull: ['$conversation._id', '$_id'] },
                chatId: { $ifNull: ['$conversation._id', null] },
                otherUser: {
                  _id: '$otherUser._id',
                  username: '$otherUser.username',
                  displayName: '$otherUser.displayName',
                  avatar: { $ifNull: ['$otherUser.avatar', null] },
                  gender: { $ifNull: ['$otherUser.gender', null] },
                },
                lastMessage: {
                  $cond: [
                    { $ifNull: ['$conversation.lastMessage.messageId', false] },
                    {
                      messageId: '$conversation.lastMessage.messageId',
                      sender: '$conversation.lastMessage.sender',
                      text: '$conversation.lastMessage.text',
                      sentAt: '$conversation.lastMessage.sentAt',
                    },
                    null,
                  ],
                },
                unreadCount: {
                  $cond: [
                    { $ifNull: ['$conversation._id', false] },
                    { $ifNull: [{ $arrayElemAt: ['$unreadMessages.count', 0] }, 0] },
                    0,
                  ],
                },
                createdAt: { $ifNull: ['$conversation.createdAt', '$acceptedAt'] },
                updatedAt: { $ifNull: ['$conversation.updatedAt', '$acceptedAt'] },
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);
    return {
      items: result?.items ?? [],
      total: result?.total[0]?.count ?? 0,
    };
  },

  updateLastMessage: (
    chatId: string,
    senderId: string,
    message: {
      messageId: Types.ObjectId;
      sender: Types.ObjectId;
      text: string;
      sentAt: Date;
    },
  ) =>
    Conversation.updateOne(
      {
        _id: chatId,
        participants: new Types.ObjectId(senderId),
        $or: [
          { lastMessage: { $exists: false } },
          { 'lastMessage.sentAt': { $lt: message.sentAt } },
          {
            'lastMessage.sentAt': message.sentAt,
            'lastMessage.messageId': { $lt: message.messageId },
          },
        ],
      },
      { $set: { lastMessage: message } },
    ),

  replaceDeletedLastMessagePreview: (chatId: string, messageId: string) =>
    Conversation.updateOne(
      { _id: chatId, 'lastMessage.messageId': messageId },
      { $set: { 'lastMessage.text': 'Message deleted' } },
    ),
};