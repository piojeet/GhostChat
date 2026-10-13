import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import { getBlockedUsers } from '../../moderation/services/moderationService';
import {
  getSecurityPreferences,
  setTwoFactorEnabled,
} from '../services/settingsService';
import { authService } from '../../auth/services/authService';
import { authStore } from '../../../store/authStore';

type Props = BottomTabScreenProps<MainTabParamList, 'SecuritySettings'>;
type SecurityAction = 'password' | 'two-factor' | 'activity' | 'devices' | 'blocked' | 'download';

type SecurityItem = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  action: SecurityAction;
};

const SecuritySettingsScreen = ({ navigation }: Props) => {
  const [twoFactorEnabled, setTwoFactorState] = useState(
    () => getSecurityPreferences().twoFactorEnabled,
  );
  const [otherSessionsSignedOut, setOtherSessionsSignedOut] = useState(false);
  const [blockedUserCount, setBlockedUserCount] = useState(
    () => getBlockedUsers().length,
  );

  useFocusEffect(
    useCallback(() => {
      setBlockedUserCount(getBlockedUsers().length);
    }, []),
  );

  const items: SecurityItem[] = [
    {
      title: 'Change Password',
      subtitle: 'Update your account password',
      icon: 'key',
      color: '#00A996',
      action: 'password',
    },
    {
      title: 'Two-Factor Authentication',
      subtitle: 'Add an extra layer of security',
      icon: 'shield',
      color: '#873BEA',
      action: 'two-factor',
    },
    {
      title: 'Login Activity',
      subtitle: 'Manage your login sessions',
      icon: 'smartphone',
      color: '#1684E8',
      action: 'activity',
    },
    {
      title: 'Trusted Devices',
      subtitle: '2 devices',
      icon: 'users',
      color: '#E5A027',
      action: 'devices',
    },
    {
      title: 'Blocked Users',
      subtitle: `${blockedUserCount} blocked accounts`,
      icon: 'user-x',
      color: '#E92F70',
      action: 'blocked',
    },
    {
      title: 'Download My Data',
      subtitle: 'Get a copy of your data',
      icon: 'download',
      color: '#8E3BE6',
      action: 'download',
    },
  ];

  const showLoginActivity = () => {
    Alert.alert(
      'Login Activity',
      'Current device • This device • Active now\nAndroid device • Last active 2 days ago',
      [
        { text: 'Close', style: 'cancel' },
        ...(!otherSessionsSignedOut
          ? [
              {
                text: 'Log Out Other Device',
                style: 'destructive' as const,
                onPress: () => setOtherSessionsSignedOut(true),
              },
            ]
          : []),
      ],
    );
  };

  const handlePress = async (action: SecurityAction) => {
    switch (action) {
      case 'password': {
        const email = authStore.getState().user?.email;
        if (!email) {
          Alert.alert('Account unavailable', 'Sign in again before changing your password.');
          return;
        }
        try {
          await authService.forgotPassword(email);
          navigation.navigate('VerifyOtp', { email, purpose: 'password-reset' });
        } catch (error) {
          Alert.alert(
            'Request failed',
            error instanceof Error ? error.message : 'Unable to send a password reset code.',
          );
        }
        break;
      }
      case 'two-factor': {
        const nextValue = !twoFactorEnabled;
        setTwoFactorState(nextValue);
        setTwoFactorEnabled(nextValue);
        break;
      }
      case 'activity':
        showLoginActivity();
        break;
      case 'devices':
        Alert.alert(
          'Trusted Devices',
          'This device • Current\nAndroid device • Added recently\nDevice management is a demo.',
        );
        break;
      case 'blocked':
        navigation.navigate('BlockedUsers');
        break;
      case 'download':
        Alert.alert('Download My Data', 'Your data archive will be available when account services are connected.');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back to account settings"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
        <Text style={styles.title}>Security Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {items.map(item => {
          const twoFactor = item.action === 'two-factor';
          return (
            <Pressable
              key={item.action}
              accessibilityLabel={
                twoFactor
                  ? `${item.title}, ${twoFactorEnabled ? 'On' : 'Off'}`
                  : `${item.title}, ${item.subtitle}`
              }
              accessibilityRole="button"
              accessibilityState={twoFactor ? { checked: twoFactorEnabled } : undefined}
              onPress={() => handlePress(item.action)}
              style={styles.settingCard}
            >
              <View style={[styles.iconWrap, { borderColor: item.color, backgroundColor: `${item.color}22` }]}>
                <Icon name={item.icon} size={28} color={adaptThemeColor('#F7F7F8', 'color')} />
              </View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.subtitle}>
                  {item.action === 'activity' && otherSessionsSignedOut
                    ? 'Only this device is active'
                    : item.subtitle}
                </Text>
              </View>
              {twoFactor && (
                <View style={[styles.statusPill, twoFactorEnabled && styles.statusPillOn]}>
                  <Text style={[styles.statusText, twoFactorEnabled && styles.statusTextOn]}>
                    {twoFactorEnabled ? 'On' : 'Off'}
                  </Text>
                </View>
              )}
              <Icon name="chevron-right" size={24} color={adaptThemeColor('#C4C9D2', 'color')} />
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SecuritySettingsScreen;

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
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  list: {
    gap: 9,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
  },
  settingCard: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#1C2023',
    borderRadius: 20,
    backgroundColor: '#101214',
  },
  iconWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1.5,
    borderRadius: 17,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  rowTitle: {
    color: '#F5F5F6',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 5,
    color: '#9CA8BC',
    fontSize: 14,
  },
  statusPill: {
    marginRight: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 58, 77, 0.18)',
  },
  statusPillOn: {
    backgroundColor: 'rgba(30, 198, 119, 0.18)',
  },
  statusText: {
    color: '#FF5260',
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextOn: {
    color: '#34D889',
  },
});