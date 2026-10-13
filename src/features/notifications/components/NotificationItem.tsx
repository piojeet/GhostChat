import { adaptThemeColor, createAdaptiveStyles } from '../../../theme/systemTheme';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import GenderAvatar from '../../profile/components/GenderAvatar';
import type {
  NotificationEntry,
  NotificationKind,
} from '../types/notification.types';

export type { NotificationEntry, NotificationKind };

type Props = {
  item: NotificationEntry;
  onPress: (item: NotificationEntry) => void;
};

const badgeStyles: Record<NotificationKind, { icon: string; color: string }> = {
  snap: { icon: 'square', color: '#FF315B' },
  mention: { icon: 'at-sign', color: '#C600F5' },
  follow: { icon: 'user', color: '#19A8F4' },
  like: { icon: 'heart', color: '#FF315B' },
  system: { icon: '', color: '#FFEA00' },
  reply: { icon: 'message-circle', color: '#9A32F5' },
  message: { icon: 'message-circle', color: '#19A8F4' },
  friend_request: { icon: 'user-plus', color: '#267ADB' },
};

const NotificationItem = ({
  item,
  onPress,
}: Props) => {
  const badge = badgeStyles[item.kind];
  const isSystem = item.kind === 'system';
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [item.avatar]);

  return (
    <Pressable
      accessibilityLabel={`${item.name}: ${item.message}, ${item.time}`}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={styles.card}
    >
      <View style={[styles.avatarWrap, isSystem && styles.systemAvatar]}>
        {item.avatar && !avatarFailed ? (
          <Image
            source={{ uri: item.avatar }}
            style={styles.avatar}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <GenderAvatar size={64} />
        )}
        {!isSystem && (
          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Icon name={badge.icon} size={14} color={adaptThemeColor('#FFFFFF', 'color')} />
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
        <Text numberOfLines={2} style={styles.message}>{item.message}</Text>
      </View>

      <Text style={styles.time}>{item.time}</Text>
      <Icon name="chevron-right" size={21} color={adaptThemeColor('#FFFFFF', 'color')} />
    </Pressable>
  );
};

export default NotificationItem;

const styles = createAdaptiveStyles({
  card: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1B1D1F',
    borderRadius: 22,
    backgroundColor: '#0D0F10',
  },
  avatarWrap: {
    position: 'relative',
    width: 64,
    height: 64,
    marginRight: 15,
    borderRadius: 32,
    backgroundColor: '#202124',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  systemAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  badge: {
    position: 'absolute',
    right: -3,
    bottom: -1,
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#0D0F10',
  },
  details: {
    flex: 1,
    minWidth: 0,
    marginRight: 7,
  },
  name: {
    color: '#F7F7F8',
    fontSize: 16,
    fontWeight: '800',
  },
  message: {
    marginTop: 5,
    color: '#A8AFBC',
    fontSize: 15,
    lineHeight: 21,
  },
  time: {
    marginRight: 5,
    color: '#D0D2D5',
    fontSize: 14,
  },
});
