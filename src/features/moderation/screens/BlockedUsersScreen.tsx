import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import {
  getBlockedUsers,
  unblockUser,
  type BlockedUser,
} from '../services/moderationService';

type Props = BottomTabScreenProps<MainTabParamList, 'BlockedUsers'>;

const BlockedUsersScreen = ({ navigation }: Props) => {
  const [users, setUsers] = useState<BlockedUser[]>(getBlockedUsers);

  const confirmUnblock = (user: BlockedUser) => {
    Alert.alert(
      `Unblock ${user.name}?`,
      'They will be able to find and contact you again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => setUsers(unblockUser(user.id)),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back to security settings"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
        <Text style={styles.title}>Blocked Users</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {users.map(user => (
          <View key={user.id} style={styles.userCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${user.name}'s profile`}
              onPress={() =>
                navigation.navigate('PublicProfile', {
                  userId: user.id,
                  name: user.name,
                })
              }
              style={styles.userProfile}
            >
              <View style={styles.avatarWrap}>
                {user.avatar ? (
                  <Image source={user.avatar} style={styles.avatar} />
                ) : (
                  <View style={styles.unknownAvatar}>
                    <Icon name="user" size={48} color={adaptThemeColor('#454B52', 'color')} />
                  </View>
                )}
                <View style={[styles.statusDot, { backgroundColor: user.statusColor }]} />
              </View>
              <View style={styles.userInfo}>
                <Text numberOfLines={1} style={styles.name}>{user.name}</Text>
                <Text numberOfLines={1} style={styles.username}>@{user.username}</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel={`Unblock ${user.name}`}
              accessibilityRole="button"
              onPress={() => confirmUnblock(user)}
              style={styles.unblockButton}
            >
              <Icon name="slash" size={19} color={adaptThemeColor('#FF4054', 'color')} />
              <Text style={styles.unblockText}>Unblock</Text>
            </Pressable>
          </View>
        ))}

        {users.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Icon name="user-check" size={31} color={adaptThemeColor('#FFEA00', 'color')} />
            </View>
            <Text style={styles.emptyTitle}>No blocked users</Text>
            <Text style={styles.emptyMessage}>People you block will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default BlockedUsersScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080A0B',
  },
  header: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 21,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#25292D',
    borderRadius: 24,
    backgroundColor: '#111416',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  list: {
    gap: 10,
    paddingHorizontal: 19,
    paddingTop: 5,
    paddingBottom: 20,
  },
  userCard: {
    minHeight: 105,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#1D2226',
    borderRadius: 21,
    backgroundColor: '#101214',
  },
  userProfile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    width: 72,
    height: 72,
    marginRight: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  unknownAvatar: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: '#E4E7EB',
  },
  statusDot: {
    position: 'absolute',
    right: 0,
    bottom: 3,
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#101214',
    borderRadius: 8,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 9,
  },
  name: {
    color: '#F6F6F7',
    fontSize: 17,
    fontWeight: '800',
  },
  username: {
    marginTop: 4,
    color: '#9FAABC',
    fontSize: 14,
  },
  unblockButton: {
    minWidth: 112,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: '#FF4054',
    borderRadius: 15,
    backgroundColor: 'rgba(255, 64, 84, 0.045)',
  },
  unblockText: {
    color: '#FF4054',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 95,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    backgroundColor: '#1E1F17',
  },
  emptyTitle: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyMessage: {
    marginTop: 6,
    color: '#9FAABC',
    fontSize: 14,
  },
});