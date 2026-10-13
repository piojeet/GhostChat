import { adaptThemeColor, createAdaptiveStyles } from '../../../theme/systemTheme';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import GenderAvatar from '../../profile/components/GenderAvatar';

type Props = {
  name: string;
  username?: string;
  avatar?: string | null;
  gender?: 'male' | 'female' | null;
  online: boolean;
  typing: boolean;
  onBack: () => void;
  onProfile: () => void;
  onAudioCall: () => void;
  onVideoCall: () => void;
};

const ChatHeader = ({
  name,
  username,
  avatar,
  gender,
  online,
  typing,
  onBack,
  onProfile,
  onAudioCall,
  onVideoCall,
}: Props) => (
  <View style={styles.header}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to chats"
      onPress={onBack}
      style={styles.back}
    >
      <Icon name="chevron-left" size={28} color="#141313" />
    </Pressable>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${name}'s profile`}
      onPress={onProfile}
    >
      <GenderAvatar avatar={avatar} gender={gender} size={43} />
      {online && <View style={styles.onlineDot} />}
    </Pressable>
    <Pressable onPress={onProfile} style={styles.details}>
      <Text numberOfLines={1} style={styles.name}>{name}</Text>
      <Text numberOfLines={1} style={styles.status}>
        {typing ? 'typing…' : online ? 'Online' : username ? `@${username}` : 'Offline'}
      </Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Audio call" onPress={onAudioCall} style={styles.action}>
      <Icon name="phone" size={19} color={adaptThemeColor('#FFFFFF', 'color')} />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Video call" onPress={onVideoCall} style={styles.action}>
      <Icon name="video" size={21} color={adaptThemeColor('#FFFFFF', 'color')} />
    </Pressable>
  </View>
);

export default ChatHeader;

const styles = createAdaptiveStyles({
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242629',
    backgroundColor: '#0B0B0C',
  },
  back: {
    width: 38,
    height: 48,
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0B0B0C',
    backgroundColor: '#42D879',
  },
  details: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  status: {
    marginTop: 2,
    color: '#A0A4A8',
    fontSize: 12,
  },
  action: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
