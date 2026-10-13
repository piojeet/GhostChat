import { Types } from 'mongoose';
import { Message } from './message.model';
import { Conversation } from '../chat/chat.model';

export const messageRepository = {
  create: (input: {
    conversationId: string;
    senderId: string;
    recipientId: string;
    text: string;
    replyToId?: string;
  }) =>
    Message.create({
      conversation: input.conversationId,
      sender: input.senderId,
      type: 'text',
      text: input.text,
      replyTo: input.replyToId ?? null,
      receipts: [{ recipient: input.recipientId, deliveredAt: null, readAt: null }],
    }),

  createMedia: (input: {
    conversationId: string;
    senderId: string;
    recipientId: string;
    mediaType: 'image' | 'voice';
    mediaUrl: string;
    mediaMimeType: string;
    mediaPublicId: string;
    mediaResourceType: 'image' | 'video';
    mediaSizeBytes: number;
    durationSeconds: number | null;
  }) =>
    Message.create({
      conversation: input.conversationId,
      sender: input.senderId,
      type: input.mediaType,
      text: input.mediaType === 'image' ? 'Photo' : 'Voice message',
      mediaUrl: input.mediaUrl,
      mediaMimeType: input.mediaMimeType,
      mediaPublicId: input.mediaPublicId,
      mediaResourceType: input.mediaResourceType,
      mediaSizeBytes: input.mediaSizeBytes,
      durationSeconds: input.durationSeconds,
      receipts: [{ recipient: input.recipientId, deliveredAt: null, readAt: null }],
    }),

    upsertCallActivity: (input: {
      callId: string;
      conversationId: string;
      senderId: string;
      kind: 'audio' | 'video';
      status: string;
      durationSeconds: number | null;
      preview: string;
      sentAt: Date;
    }) =>
      Message.findOneAndUpdate(
        { callId: new Types.ObjectId(input.callId) },
        {
          $set: {
            callKind: input.kind,
            callStatus: input.status,
            durationSeconds: input.durationSeconds,
            text: input.preview,
          },
          $setOnInsert: {
            conversation: new Types.ObjectId(input.conversationId),
            sender: new Types.ObjectId(input.senderId),
            type: 'call',
            callId: new Types.ObjectId(input.callId),
            replyTo: null,
            sentAt: input.sentAt,
            receipts: [],
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
        .select('_id conversation sender type text callId callKind callStatus durationSeconds replyTo sentAt editedAt deletedAt receipts')
        .lean(),

    updateCallActivityPreview: (conversationId: string, messageId: Types.ObjectId, preview: string) =>
      Conversation.updateOne(
        { _id: conversationId, 'lastMessage.messageId': messageId },
        { $set: { 'lastMessage.text': preview } },
      ),

  findReply: (replyToId: string, conversationId: string) =>
    Message.exists({
      _id: replyToId,
      conversation: conversationId,
      deletedAt: null,
    }),

  findPage: (conversationId: string, skip: number, limit: number) =>
    Promise.all([
      Message.find({ conversation: conversationId })
        .select('_id conversation sender type text mediaUrl mediaMimeType mediaSizeBytes callId callKind callStatus durationSeconds replyTo sentAt editedAt deletedAt receipts')
        .sort({ sentAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversation: conversationId }),
    ]),

  markReceivedRead: async (conversationId: string, recipientId: string, readAt: Date) => {
    const unreadMessages = await Message.find({
      conversation: conversationId,
      sender: { $ne: recipientId },
      receipts: { $elemMatch: { recipient: recipientId, readAt: null } },
    })
      .select('_id sender')
      .lean();
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: recipientId },
        receipts: { $elemMatch: { recipient: recipientId, readAt: null } },
      },
      { $set: { 'receipts.$[receipt].deliveredAt': readAt } },
      {
        arrayFilters: [
          {
            'receipt.recipient': new Types.ObjectId(recipientId),
            'receipt.readAt': null,
            'receipt.deliveredAt': null,
          },
        ],
      },
    );
    const readResult = await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: recipientId },
        receipts: { $elemMatch: { recipient: recipientId, readAt: null } },
      },
      { $set: { 'receipts.$[receipt].readAt': readAt } },
      {
        arrayFilters: [
          { 'receipt.recipient': new Types.ObjectId(recipientId), 'receipt.readAt': null },
        ],
      },
    );
    return {
      modifiedCount: readResult.modifiedCount,
      messages: unreadMessages.map(message => ({
        messageId: message._id.toString(),
        senderId: message.sender.toString(),
      })),
    };
  },

  markDelivered: async (
    messageId: string,
    conversationId: string,
    recipientId: string,
    deliveredAt: Date,
  ): Promise<boolean> => {
    const result = await Message.updateOne(
      {
        _id: messageId,
        conversation: conversationId,
        receipts: { $elemMatch: { recipient: recipientId, deliveredAt: null } },
      },
      { $set: { 'receipts.$[receipt].deliveredAt': deliveredAt } },
      {
        arrayFilters: [
          {
            'receipt.recipient': new Types.ObjectId(recipientId),
            'receipt.deliveredAt': null,
          },
        ],
      },
    );
    return result.modifiedCount > 0;
  },

  findInConversation: (messageId: string, conversationId: string) =>
    Message.findOne({ _id: messageId, conversation: conversationId })
      .select('_id sender type deletedAt mediaPublicId mediaResourceType')
      .lean(),

  softDelete: (messageId: string, conversationId: string, senderId: string, deletedAt: Date) =>
    Message.findOneAndUpdate(
      {
        _id: messageId,
        conversation: conversationId,
        sender: senderId,
        deletedAt: null,
      },
      { $set: { text: '', deletedAt } },
      { new: true },
    )
      .select('_id sender type text sentAt editedAt deletedAt replyTo receipts')
      .lean(),
};