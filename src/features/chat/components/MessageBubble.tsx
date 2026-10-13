import { adaptThemeColor, createAdaptiveStyles } from '../../../theme/systemTheme';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import type { ChatMessage } from '../types/message.types';
import GenderAvatar from '../../profile/components/GenderAvatar';
import ImageMessage from './ImageMessage';
import VoiceMessage from './VoiceMessage';

type Props = {
  message: ChatMessage;
  mine: boolean;
  avatar?: string | null;
  gender?: 'male' | 'female' | null;
  onLongPress?: () => void;
};

const MessageBubble = ({ message, mine, avatar, gender, onLongPress }: Props) => {
  const receipt = message.receipts[0];
  const callKindLabel = message.callKind === 'video' ? 'Video' : 'Audio';
  const callDuration = message.durationSeconds == null
    ? ''
    : `${Math.floor(message.durationSeconds / 60)}:${String(message.durationSeconds % 60).padStart(2, '0')}`;
  const callLabel = message.callStatus === 'ringing' ||
    message.callStatus === 'accepted' ||
    message.callStatus === 'connected'
    ? `${mine ? 'Outgoing' : 'Incoming'} ${callKindLabel.toLowerCase()} call`
    : message.callStatus === 'ended'
      ? `${callKindLabel} call${callDuration ? ` · ${callDuration}` : ' ended'}`
      : message.callStatus === 'rejected'
        ? mine ? `${callKindLabel} call declined` : `You declined ${callKindLabel.toLowerCase()} call`
        : message.callStatus === 'cancelled'
          ? mine ? `You cancelled ${callKindLabel.toLowerCase()} call` : `${callKindLabel} call cancelled`
          : message.callStatus === 'missed' ||
              message.callStatus === 'timeout' ||
              message.callStatus === 'unavailable'
            ? mine ? `No answer · ${callKindLabel.toLowerCase()} call` : `Missed ${callKindLabel.toLowerCase()} call`
            : message.callStatus === 'busy'
              ? mine ? `${callKindLabel} call · Busy` : `${callKindLabel} call`
              : `${callKindLabel} call failed`;
  const receiptLabel = !mine
    ? null
    : message.type === 'call'
      ? null
    : receipt?.readAt
      ? 'Read'
      : receipt?.deliveredAt
        ? 'Delivered'
        : 'Sent';
  return (
    <View style={[styles.row, mine ? styles.mineRow : styles.theirRow]}>
      {!mine ? <GenderAvatar avatar={avatar} gender={gender} size={27} /> : null}
      <Pressable
        onLongPress={message.type === 'text' ? onLongPress : undefined}
        style={[
          styles.bubble,
          mine ? styles.mineBubble : styles.theirBubble,
          message.type === 'image' && styles.mediaBubble,
        ]}
      >
        {message.type === 'call' ? (
          <View style={styles.callContent}>
            <View style={styles.callIcon}>
              <Icon
                name={message.callKind === 'video' ? 'video' : 'phone'}
                size={17}
                color="#FFEA00"
              />
            </View>
            <Text style={styles.messageText}>{callLabel}</Text>
          </View>
        ) : message.deletedAt ? (
          <Text style={styles.deletedMessage}>This message was deleted</Text>
        ) : message.type === 'image' && message.mediaUrl ? (
          <ImageMessage uri={message.mediaUrl} />
        ) : message.type === 'voice' && message.mediaUrl ? (
          <VoiceMessage
            uri={message.mediaUrl}
            durationSeconds={message.durationSeconds ?? 0}
          />
        ) : (
          <Text style={styles.messageText}>
            {message.text}
          </Text>
        )}
        <View style={styles.meta}>
          <Text style={styles.time}>
            {new Date(message.sentAt).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
          {receiptLabel && (
            <Text style={[styles.receipt, receipt?.readAt && styles.readReceipt]}>
              {receiptLabel}
            </Text>
          )}
        </View>
      </Pressable>
      {mine ? <GenderAvatar avatar={avatar} gender={gender} size={27} /> : null}
    </View>
  );
};

export default MessageBubble;

const styles = createAdaptiveStyles({
  row: {
    maxWidth: '88%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    marginVertical: 5,
  },
  mineRow: {
    alignSelf: 'flex-end',
  },
  theirRow: {
    alignSelf: 'flex-start',
  },
  bubble: {
    maxWidth: '100%',
    minWidth: 78,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 19,
  },
  mineBubble: {
    borderBottomRightRadius: 5,
    backgroundColor: '#463C00',
  },
  theirBubble: {
    borderBottomLeftRadius: 5,
    backgroundColor: '#242629',
  },
  mediaBubble: {
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  deletedMessage: {
    color: '#A5A8AB',
    fontSize: 14,
    fontStyle: 'italic',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
  },
  callContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  callIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#161616',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  time: {
    color: '#A5A8AB',
    fontSize: 10,
  },
  receipt: {
    color: adaptThemeColor('#BFC2C5', 'color'),
    fontSize: 10,
  },
  readReceipt: {
    color: '#FFEA00',
  },
});
