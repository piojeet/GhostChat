import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';

type Props = BottomTabScreenProps<MainTabParamList, 'Settings'> & {
  onLogout: () => void;
};

type SettingItem = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
};

const avatar = require('../../../assets/images/avatars/alex.jpg');

const settingsItems: SettingItem[] = [
  {
    title: 'Notifications',
    subtitle: 'Manage your notifications',
    icon: 'bell',
    color: '#443D12',
  },
  {
    title: 'Privacy',
    subtitle: 'Who can contact you',
    icon: 'lock',
    color: '#17372C',
  },
  {
    title: 'Data & Storage',
    subtitle: 'Manage storage and data usage',
    icon: 'database',
    color: '#1B2341',
  },
  {
    title: 'Appearance',
    subtitle: 'Dark mode, theme',
    icon: 'moon',
    color: '#351B3C',
  },
  {
    title: 'Help & Support',
    subtitle: 'Get help',
    icon: 'help-circle',
    color: '#392317',
  },
  {
    title: 'About',
    subtitle: 'Version 1.0.0',
    icon: 'info',
    color: '#12313A',
  },
];

const SettingsScreen = ({ navigation, onLogout }: Props) => {
  const showUnavailable = (title: string) => {
    Alert.alert(title, `${title} settings will be available soon.`);
  };

  const confirmLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to profile"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Profile' })
            }
            style={styles.backButton}
          >
            <Icon name="chevron-left" size={29} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('AccountSettings')}
          style={[styles.settingCard, styles.accountCard]}
        >
          <Image source={avatar} style={styles.accountAvatar} />
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Account</Text>
            <Text style={styles.settingSubtitle}>Profile, security, privacy</Text>
          </View>
          <Icon name="chevron-right" size={25} color={adaptThemeColor('#A0A0A9', 'color')} />
        </Pressable>

        <View style={styles.settingsList}>
          {settingsItems.map(item => (
            <SettingsRow
              key={item.title}
              item={item}
              onPress={() =>
                item.title === 'Notifications'
                  ? navigation.navigate('NotificationSettings')
                  : item.title === 'Privacy'
                    ? navigation.navigate('PrivacySettings')
                    : showUnavailable(item.title)
              }
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={confirmLogout}
          style={styles.logoutButton}
        >
          <Icon name="log-out" size={22} color={adaptThemeColor('#FF4D55', 'color')} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const SettingsRow = ({
  item,
  onPress,
}: {
  item: SettingItem;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={styles.settingCard}
  >
    <View style={[styles.iconTile, { backgroundColor: item.color }]}>
      <Icon name={item.icon} size={29} color={adaptThemeColor('#F6F6F8', 'color')} />
      {item.title === 'Notifications' && <View style={styles.notificationDot} />}
    </View>
    <View style={styles.settingCopy}>
      <Text style={styles.settingTitle}>{item.title}</Text>
      <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
    </View>
    <Icon name="chevron-right" size={25} color={adaptThemeColor('#A0A0A9', 'color')} />
  </Pressable>
);

export default SettingsScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  header: {
    height: 78,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  backButton: {
    width: 35,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: 2,
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
  },
  settingsList: {
    gap: 9,
    marginTop: 10,
  },
  settingCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#202022',
    backgroundColor: '#111112',
  },
  accountCard: {
    borderColor: '#303034',
    backgroundColor: '#19191B',
  },
  accountAvatar: {
    width: 58,
    height: 58,
    borderRadius: 30,
  },
  iconTile: {
    position: 'relative',
    width: 57,
    height: 57,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFEA00',
  },
  settingCopy: {
    flex: 1,
    marginLeft: 19,
  },
  settingTitle: {
    color: '#F7F7F8',
    fontSize: 17,
    fontWeight: '700',
  },
  settingSubtitle: {
    marginTop: 5,
    color: '#A0A0AA',
    fontSize: 13,
  },
  logoutButton: {
    height: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#FF3F48',
    backgroundColor: 'rgba(255, 63, 72, 0.05)',
  },
  logoutText: {
    color: '#FF4D55',
    fontSize: 17,
    fontWeight: '700',
  },
});