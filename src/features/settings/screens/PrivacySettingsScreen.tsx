import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StatusBar, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import {
  getPrivacyPreferences,
  setPrivacyChoice,
  setPrivacyToggle,
  type PrivacyChoice,
  type PrivacyPreferences,
} from '../services/settingsService';

type Props = BottomTabScreenProps<MainTabParamList, 'PrivacySettings'>;

type ChoiceKey = 'whoCanContact' | 'whoCanViewStory' | 'whoCanSeeLocation';
type ToggleKey = 'showInQuickAdd' | 'allowFriendRequests' | 'readReceipts' | 'activityStatus';

type ChoiceRow = {
  key: ChoiceKey;
  title: string;
  icon: string;
  color: string;
};

type ToggleRow = {
  key: ToggleKey;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
};

const choiceRows: ChoiceRow[] = [
  { key: 'whoCanContact', title: 'Who Can Contact You', icon: 'user', color: '#079B91' },
  { key: 'whoCanViewStory', title: 'Who Can View My Story', icon: 'users', color: '#7738E8' },
  { key: 'whoCanSeeLocation', title: 'Who Can See My Location', icon: 'map-pin', color: '#1686ED' },
];

const toggleRows: ToggleRow[] = [
  { key: 'showInQuickAdd', title: 'Show Me in Quick Add', subtitle: 'Let others find and add you easily', icon: 'star', color: '#D2AD0A' },
  { key: 'allowFriendRequests', title: 'Allow Friend Requests', subtitle: 'Let others send you friend requests', icon: 'user-plus', color: '#E7268B' },
  { key: 'readReceipts', title: 'Read Receipts', subtitle: 'Let others know you’ve seen their messages', icon: 'book-open', color: '#8436E4' },
  { key: 'activityStatus', title: 'Activity Status', subtitle: 'Show when you’re active', icon: 'bar-chart-2', color: '#147CE1' },
];

const PrivacySettingsScreen = ({ navigation }: Props) => {
  const [preferences, setPreferences] = useState<PrivacyPreferences>(getPrivacyPreferences);

  const selectPrivacy = (key: ChoiceKey, title: string) => {
    const current = preferences[key];
    const options: PrivacyChoice[] = ['Everyone', 'Friends Only', 'Nobody'];

    Alert.alert(title, 'Choose who can see this information.', [
      ...options.map(value => ({
        text: value === current ? `${value} ✓` : value,
        onPress: () => setPreferences(setPrivacyChoice(key, value)),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const togglePrivacy = (key: ToggleKey, value: boolean) => {
    setPreferences(setPrivacyToggle(key, value));
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
        <Text style={styles.title}>Privacy Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {choiceRows.map(row => (
          <Pressable
            key={row.key}
            accessibilityLabel={`${row.title}, ${preferences[row.key]}`}
            accessibilityRole="button"
            onPress={() => selectPrivacy(row.key, row.title)}
            style={[styles.settingCard, styles.choiceCard, { borderColor: `${row.color}55` }]}
          >
            <IconBadge icon={row.icon} color={row.color} />
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.subtitle}>{preferences[row.key]}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={adaptThemeColor('#C2C7D0', 'color')} />
          </Pressable>
        ))}

        {toggleRows.map(row => (
          <View key={row.key} style={styles.settingCard}>
            <IconBadge icon={row.icon} color={row.color} />
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.subtitle}>{row.subtitle}</Text>
            </View>
            <Switch
              accessibilityLabel={row.title}
              onValueChange={value => togglePrivacy(row.key, value)}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#42454D', true: '#FFEA00' }}
              value={preferences[row.key]}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const IconBadge = ({ icon, color }: { icon: string; color: string }) => (
  <View style={[styles.iconBadge, { borderColor: color, backgroundColor: `${color}25` }]}>
    <Icon name={icon} size={27} color={adaptThemeColor('#F7F7F8', 'color')} />
  </View>
);

export default PrivacySettingsScreen;

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
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#1C2023',
    borderRadius: 20,
    backgroundColor: '#101214',
  },
  choiceCard: {
    minHeight: 94,
  },
  iconBadge: {
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