import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React from 'react';
import { Alert, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import { getSecurityPreferences } from '../services/settingsService';
import { useAuth } from '../../auth/hooks/useAuth';

type Props = BottomTabScreenProps<MainTabParamList, 'AccountSettings'>;

type AccountSetting = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  action: 'personal' | 'username' | 'email' | 'phone' | 'password' | 'two-factor';
};

const AccountSettingsScreen = ({ navigation }: Props) => {
  const twoFactorEnabled = getSecurityPreferences().twoFactorEnabled;
  const { user } = useAuth();

  const items: AccountSetting[] = [
    {
      title: 'Personal Information',
      subtitle: 'Name, email, phone',
      icon: 'user',
      color: '#116658',
      action: 'personal',
    },
    {
      title: 'Username',
      subtitle: user ? `@${user.username}` : 'Username',
      icon: 'user',
      color: '#593C8D',
      action: 'username',
    },
    {
      title: 'Email',
      subtitle: user?.email ?? 'Email address',
      icon: 'mail',
      color: '#145D8A',
      action: 'email',
    },
    {
      title: 'Phone Number',
      subtitle: '+91 98765 43210',
      icon: 'phone',
      color: '#177445',
      action: 'phone',
    },
    {
      title: 'Change Password',
      subtitle: 'Update your password',
      icon: 'lock',
      color: '#745A16',
      action: 'password',
    },
    {
      title: 'Two-Factor Authentication',
      subtitle: twoFactorEnabled ? 'Enabled for this device' : 'Add an extra layer of security',
      icon: 'shield',
      color: '#58327D',
      action: 'two-factor',
    },
  ];

  const handleItemPress = (item: AccountSetting) => {
    switch (item.action) {
      case 'personal':
      case 'username':
        navigation.navigate('EditProfile');
        break;
      case 'email':
      case 'phone':
        Alert.alert(item.title, `${item.title} changes are not connected to an account service yet.`);
        break;
      case 'password':
        navigation.navigate('ResetPassword');
        break;
      case 'two-factor':
        navigation.navigate('SecuritySettings');
        break;
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Account',
      'Account deletion is permanent. This demo has no account service, so no account will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Unavailable', 'Account deletion is not connected yet.'),
        },
      ],
    );
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
            accessibilityLabel="Go back to settings"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
          <Text style={styles.title}>Account Settings</Text>
        </View>

        <View style={styles.settingsList}>
          {items.map(item => (
            <Pressable
              key={item.action}
              accessibilityLabel={`${item.title}, ${item.subtitle}`}
              accessibilityRole="button"
              accessibilityState={
                item.action === 'two-factor'
                  ? { checked: twoFactorEnabled }
                  : undefined
              }
              onPress={() => handleItemPress(item)}
              style={styles.settingCard}
            >
              <View style={[styles.iconWrap, { borderColor: `${item.color}CC`, backgroundColor: `${item.color}30` }]}>
                <Icon name={item.icon} size={27} color={adaptThemeColor('#F4F5F7', 'color')} />
              </View>
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.itemSubtitle}>{item.subtitle}</Text>
              </View>
              {item.action === 'two-factor' ? (
                <View style={[styles.switchTrack, twoFactorEnabled && styles.switchTrackEnabled]}>
                  <View style={[styles.switchThumb, twoFactorEnabled && styles.switchThumbEnabled]} />
                </View>
              ) : (
                <Icon name="chevron-right" size={25} color={adaptThemeColor('#C2C7D0', 'color')} />
              )}
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityLabel="Delete account"
          accessibilityRole="button"
          onPress={confirmDelete}
          style={styles.deleteButton}
        >
          <Icon name="trash-2" size={25} color={adaptThemeColor('#FF4655', 'color')} />
          <Text style={styles.deleteText}>Delete Account</Text>
          <Icon name="chevron-right" size={25} color={adaptThemeColor('#FF4655', 'color')} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountSettingsScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080A0B',
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  header: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#272A2E',
    borderRadius: 25,
    backgroundColor: '#111416',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  settingsList: {
    gap: 10,
  },
  settingCard: {
    minHeight: 91,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#1C2023',
    borderRadius: 21,
    backgroundColor: '#0F1113',
  },
  iconWrap: {
    width: 59,
    height: 59,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 17,
    borderWidth: 1.5,
    borderRadius: 30,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 7,
  },
  itemTitle: {
    color: '#F7F7F8',
    fontSize: 17,
    fontWeight: '700',
  },
  itemSubtitle: {
    marginTop: 5,
    color: '#A4AFC1',
    fontSize: 14,
  },
  switchTrack: {
    width: 48,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderRadius: 16,
    backgroundColor: '#363A40',
  },
  switchTrackEnabled: {
    backgroundColor: '#FFEA00',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  switchThumbEnabled: {
    alignSelf: 'flex-end',
    backgroundColor: '#111111',
  },
  deleteButton: {
    minHeight: 81,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 17,
    marginTop: 17,
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderColor: '#FF3848',
    borderRadius: 20,
    backgroundColor: 'rgba(110, 17, 22, 0.2)',
  },
  deleteText: {
    flex: 1,
    color: '#FF4655',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
});