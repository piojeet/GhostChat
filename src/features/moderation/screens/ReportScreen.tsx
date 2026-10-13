import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';

type Props = BottomTabScreenProps<MainTabParamList, 'Report'>;
type ReportReason = 'Harassment' | 'Inappropriate Content' | 'Fake Account' | 'Spam' | 'Other';

type ReasonOption = {
  title: ReportReason;
  description: string;
  icon: string;
  color: string;
};

const reasons: ReasonOption[] = [
  { title: 'Harassment', description: 'Bullying, threats, or unwanted contact', icon: 'alert-circle', color: '#FF4354' },
  { title: 'Inappropriate Content', description: 'Nudity, violence, or sensitive content', icon: 'file-text', color: '#FFEA00' },
  { title: 'Fake Account', description: 'Pretending to be someone else', icon: 'user', color: '#A748F2' },
  { title: 'Spam', description: 'Unwanted promotional content', icon: 'mail', color: '#199BFF' },
  { title: 'Other', description: 'Something else', icon: 'more-horizontal', color: '#9299A4' },
];

const alexAvatar = require('../../../assets/images/avatars/alex.jpg');

const ReportScreen = ({ navigation, route }: Props) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const { name, username, userId } = route.params;
  const avatar = userId === 'priya'
    ? require('../../../assets/images/onboarding/onboarding-card-1.png')
    : userId === 'rahul' || userId === 'aditya'
      ? require('../../../assets/images/onboarding/onboarding-card-3.png')
      : alexAvatar;

  const submitReport = () => {
    if (!selectedReason) {
      Alert.alert('Choose a reason', 'Select why you are reporting this account.');
      return;
    }

    Alert.alert(
      'Report prepared',
      `Your ${selectedReason.toLowerCase()} report for ${name} is ready. Reports are not sent because moderation services are not connected.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
        </Pressable>
        <Text style={styles.headerTitle}>Report</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.userCard}>
          <View style={styles.avatarWrap}>
            <Image source={avatar} style={styles.avatar} />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.userInfo}>
            <Text numberOfLines={1} style={styles.userName}>{name}</Text>
            <Text numberOfLines={1} style={styles.username}>@{username ?? userId}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Reason for reporting</Text>
        <View style={styles.reasons}>
          {reasons.map(reason => {
            const selected = selectedReason === reason.title;
            return (
              <Pressable
                key={reason.title}
                accessibilityLabel={`${reason.title}: ${reason.description}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setSelectedReason(reason.title)}
                style={[
                  styles.reasonCard,
                  selected && styles.reasonCardSelected,
                  selected && { borderColor: reason.color },
                ]}
              >
                <View
                  style={[
                    styles.reasonIcon,
                    { borderColor: reason.color, backgroundColor: `${reason.color}18` },
                    selected && { backgroundColor: `${reason.color}2A` },
                  ]}
                >
                  <Icon name={reason.icon} size={25} color={reason.color} />
                </View>
                <View style={styles.reasonCopy}>
                  <Text style={styles.reasonTitle}>{reason.title}</Text>
                  <Text numberOfLines={2} style={styles.reasonDescription}>{reason.description}</Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    selected && { borderColor: reason.color },
                  ]}
                >
                  {selected && (
                    <View style={[styles.radioInner, { backgroundColor: reason.color }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.detailsBox}>
          <TextInput
            accessibilityLabel="Optional report details"
            maxLength={500}
            multiline
            onChangeText={setDetails}
            placeholder="Add details (optional)"
            placeholderTextColor={adaptThemeColor('#8490A4', 'color')}
            style={styles.detailsInput}
            textAlignVertical="top"
            value={details}
          />
          <Text style={styles.characterCount}>{details.length}/500</Text>
        </View>

        <Pressable
          accessibilityLabel="Submit report"
          accessibilityRole="button"
          onPress={submitReport}
          style={styles.submitButton}
        >
          <Icon name="send" size={22} color={adaptThemeColor('#FFFFFF', 'color')} />
          <Text style={styles.submitText}>Submit Report</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ReportScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080A0B',
  },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 21,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#272A2E',
    borderRadius: 24,
    backgroundColor: '#111416',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  userCard: {
    minHeight: 91,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 19,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#202428',
    borderRadius: 20,
    backgroundColor: '#101214',
  },
  avatarWrap: {
    position: 'relative',
    width: 64,
    height: 64,
    marginRight: 15,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: 2,
    width: 15,
    height: 15,
    borderWidth: 2,
    borderColor: '#101214',
    borderRadius: 8,
    backgroundColor: '#2BCC67',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: '#F5F5F6',
    fontSize: 18,
    fontWeight: '800',
  },
  username: {
    marginTop: 4,
    color: '#9DA9BC',
    fontSize: 15,
  },
  sectionTitle: {
    marginBottom: 11,
    color: '#F5F5F6',
    fontSize: 19,
    fontWeight: '800',
  },
  reasons: {
    gap: 7,
  },
  reasonCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#202428',
    borderRadius: 18,
    backgroundColor: '#101214',
  },
  reasonCardSelected: {
    backgroundColor: 'rgba(255, 234, 0, 0.055)',
  },
  reasonIcon: {
    width: 49,
    height: 49,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
    borderWidth: 1.5,
    borderRadius: 25,
  },
  reasonCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  reasonTitle: {
    color: '#F4F4F5',
    fontSize: 15,
    fontWeight: '700',
  },
  reasonDescription: {
    marginTop: 4,
    color: '#9BA7BB',
    fontSize: 12,
  },
  radioOuter: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#B7BECA',
    borderRadius: 14,
  },
  radioInner: {
    width: 15,
    height: 15,
    borderRadius: 8,
  },
  detailsBox: {
    minHeight: 105,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 9,
    borderWidth: 1,
    borderColor: '#3B4048',
    borderRadius: 17,
    backgroundColor: '#111315',
  },
  detailsInput: {
    minHeight: 63,
    padding: 0,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
  },
  characterCount: {
    alignSelf: 'flex-end',
    color: '#9DA8BA',
    fontSize: 12,
  },
  submitButton: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    marginTop: 14,
    borderRadius: 23,
    backgroundColor: '#F53548',
    shadowColor: '#F53548',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});