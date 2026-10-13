import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useState } from 'react';
import { Pressable, ScrollView, StatusBar, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import {
  getNotificationPreferences,
  setNotificationPreference,
  type NotificationPreferenceKey,
} from '../services/settingsService';

type Props = BottomTabScreenProps<MainTabParamList, 'NotificationSettings'>;

type PreferenceRow = {
  key: NotificationPreferenceKey;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
};

const preferenceRows: PreferenceRow[] = [
  { key: 'push', title: 'Push Notifications', subtitle: 'Get notified on your device', icon: 'bell', color: '#C7AF00' },
  { key: 'snaps', title: 'Snap Notifications', subtitle: 'Get notified for new snaps', icon: 'zap', color: '#873CE1' },
  { key: 'stories', title: 'Story Notifications', subtitle: 'Get notified for new stories', icon: 'plus-circle', color: '#E52C65' },
  { key: 'friendRequests', title: 'Friend Requests', subtitle: 'Get notified for new requests', icon: 'user-plus', color: '#267ADB' },
  { key: 'mentions', title: 'Mentions', subtitle: 'Get notified when someone mentions you', icon: 'at-sign', color: '#15B96D' },
  { key: 'comments', title: 'Comments', subtitle: 'Get notified for new comments', icon: 'message-circle', color: '#873CE1' },
  { key: 'likes', title: 'Likes', subtitle: 'Get notified for new likes', icon: 'heart', color: '#E52C65' },
  { key: 'newFollowers', title: 'New Followers', subtitle: 'Get notified for new followers', icon: 'user-plus', color: '#0CBDA7' },
  { key: 'systemUpdates', title: 'System Updates', subtitle: 'Important updates and announcements', icon: 'settings', color: '#E49510' },
];

const NotificationSettingsScreen = ({ navigation }: Props) => {
  const [preferences, setPreferences] = useState(getNotificationPreferences);

  const togglePreference = (key: NotificationPreferenceKey, enabled: boolean) => {
    setPreferences(setNotificationPreference(key, enabled));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back to settings"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
        <Text style={styles.title}>Notification Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {preferenceRows.map(row => (
          <View key={row.key} style={styles.settingCard}>
            <View style={[styles.iconWrap, { borderColor: row.color, backgroundColor: `${row.color}22` }]}>
              <Icon name={row.icon} size={26} color={adaptThemeColor('#F7F7F8', 'color')} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.subtitle}>{row.subtitle}</Text>
            </View>
            <Switch
              accessibilityLabel={`${row.title}`}
              onValueChange={value => togglePreference(row.key, value)}
              thumbColor={preferences[row.key] ? '#FFFFFF' : '#F1F1F1'}
              trackColor={{ false: '#42454D', true: '#FFEA00' }}
              value={preferences[row.key]}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationSettingsScreen;

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
    fontSize: 25,
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
    minHeight: 83,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#1C2023',
    borderRadius: 20,
    backgroundColor: '#101214',
  },
  iconWrap: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    borderWidth: 1.5,
    borderRadius: 27,
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
    marginTop: 4,
    color: '#9CA8BC',
    fontSize: 13,
    lineHeight: 18,
  },
});