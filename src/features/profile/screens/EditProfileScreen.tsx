import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useCallback, useState } from 'react';
import { Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import { getMyProfile, updateMyProfile, uploadMyAvatar } from '../services/profileService';
import { authStore } from '../../../store/authStore';
import { ApiError } from '../../../services/api/apiError';
import GenderAvatar from '../components/GenderAvatar';

type Props = BottomTabScreenProps<MainTabParamList, 'EditProfile'>;

const EditProfileScreen = ({ navigation }: Props) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    getMyProfile().then(profile => {
      if (!active) return;
      setName(profile.displayName);
      setUsername(profile.username);
      setBio(profile.bio);
      setAvatar(profile.avatar);
      setGender(profile.gender ?? null);
      setLoading(false);
    }).catch(error => {
      if (!active) return;
      setLoading(false);
      Alert.alert('Unable to load profile', error instanceof ApiError ? error.message : 'Please try again.');
    });
    return () => { active = false; };
  }, []));

  const choosePhoto = async () => {
    if (saving || uploading) return;
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
        assetRepresentationMode: 'compatible',
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert(
          result.errorCode === 'permission' ? 'Gallery permission denied' : 'Unable to open gallery',
          result.errorMessage ?? 'Please try again.',
        );
        return;
      }
      const image = result.assets?.[0];
      if (!image?.uri) {
        Alert.alert('Unable to select photo', 'The selected image could not be opened.');
        return;
      }

      setUploading(true);
      const profile = await uploadMyAvatar(
        image.uri,
        image.type ?? 'image/jpeg',
        image.fileName ?? `avatar-${Date.now()}.jpg`,
      );
      setAvatar(profile.avatar);
      authStore.updateProfile(profile);
    } catch (error) {
      Alert.alert(
        'Unable to upload photo',
        error instanceof ApiError ? error.message : 'Please try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  const saveChanges = async () => {
    if (saving || uploading) return;
    const normalizedName = name.trim();
    const normalizedUsername = username.trim().replace(/^@/, '');

    if (!normalizedName || !normalizedUsername) {
      Alert.alert('Missing information', 'Please enter both your name and username.');
      return;
    }

    setSaving(true);
    try {
      const profile = await updateMyProfile({
      displayName: normalizedName,
      username: normalizedUsername,
      bio: bio.trim(),
      gender,
      });
      authStore.updateProfile(profile);
      navigation.navigate('MainTabs', { screen: 'Profile' });
    } catch (error) {
      Alert.alert(
        'Unable to save profile',
        error instanceof ApiError ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color={adaptThemeColor('#FFFFFF', 'color')} />
          </Pressable>
          <Text style={styles.title}>Edit Profile</Text>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.photoSection}>
            <Pressable
              accessibilityLabel="Change profile photo"
              accessibilityRole="button"
              onPress={choosePhoto}
              style={styles.avatarRing}
            >
              <GenderAvatar avatar={avatar} gender={gender} size={144} />
              <View style={styles.cameraBadge}>
                <Icon name="camera" size={18} color={adaptThemeColor('#FFFFFF', 'color')} />
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={loading || saving || uploading}
              onPress={choosePhoto}
              style={styles.changePhotoButton}
            >
              <Icon name="camera" size={21} color={adaptThemeColor('#FFEA00', 'color')} />
              <Text style={styles.changePhotoText}>
                {uploading ? 'Uploading…' : 'Change Photo'}
              </Text>
            </Pressable>
          </View>

          {loading ? <ActivityIndicator color={adaptThemeColor('#FFEA00', 'color')} /> : null}
          <ProfileField
            icon="user"
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            maxLength={80}
            editable={!loading && !saving}
          />
          <ProfileField
            icon="user"
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            autoCapitalize="none"
            maxLength={30}
            editable={!loading && !saving}
          />
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Icon name="users" size={21} color={adaptThemeColor('#FFEA00', 'color')} />
              <Text style={styles.label}>Gender</Text>
            </View>
            <View style={styles.genderOptions}>
              {([
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
                { label: 'Not set', value: null },
              ] as const).map(option => {
                const selected = gender === option.value;
                return (
                  <Pressable
                    key={option.label}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    disabled={loading || saving || uploading}
                    onPress={() => setGender(option.value)}
                    style={[
                      styles.genderOption,
                      selected && styles.genderOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        selected && styles.genderOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Icon name="align-left" size={21} color={adaptThemeColor('#FFEA00', 'color')} />
              <Text style={styles.label}>Bio</Text>
            </View>
            <View style={styles.bioInputWrap}>
              <TextInput
                accessibilityLabel="Bio"
                editable={!loading && !saving}
                maxLength={150}
                multiline
                onChangeText={setBio}
                placeholder="Tell people a little about yourself"
                placeholderTextColor={adaptThemeColor('#777B82', 'color')}
                style={styles.bioInput}
                textAlignVertical="top"
                value={bio}
              />
              <Text style={styles.bioCount}>{bio.length}/150</Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel="Save profile changes"
            accessibilityRole="button"
            onPress={saveChanges}
            disabled={loading || saving || uploading}
            style={[styles.saveButton, (loading || saving || uploading) && styles.disabledButton]}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving…' : uploading ? 'Uploading…' : 'Save Changes'}
            </Text>
            <Icon name="arrow-right" size={25} color={adaptThemeColor('#080808', 'color')} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

type ProfileFieldProps = {
  icon: string;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength: number;
  editable: boolean;
};

const ProfileField = ({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'words',
  maxLength,
  editable,
}: ProfileFieldProps) => (
  <View style={styles.fieldGroup}>
    <View style={styles.labelRow}>
      <Icon name={icon} size={21} color={adaptThemeColor('#FFEA00', 'color')} />
      <Text style={styles.label}>{label}</Text>
    </View>
    <TextInput
      accessibilityLabel={label}
      autoCapitalize={autoCapitalize}
      editable={editable}
      maxLength={maxLength}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={adaptThemeColor('#777B82', 'color')}
      style={styles.textInput}
      value={value}
    />
  </View>
);

export default EditProfileScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#2D3034',
    borderRadius: 24,
    backgroundColor: '#111315',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 26,
  },
  photoSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 23,
  },
  avatarRing: {
    position: 'relative',
    width: 154,
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFEA00',
    borderRadius: 77,
    shadowColor: '#FFEA00',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: 8,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#080808',
    borderRadius: 23,
    backgroundColor: '#17191C',
  },
  changePhotoButton: {
    minWidth: 210,
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#FFEA00',
    borderRadius: 26,
  },
  changePhotoText: {
    color: '#F7F7F7',
    fontSize: 16,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  label: {
    color: '#F1F1F2',
    fontSize: 17,
    fontWeight: '600',
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    minHeight: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#292C30',
    borderRadius: 14,
    backgroundColor: '#121416',
  },
  genderOptionSelected: {
    borderColor: '#FFEA00',
    backgroundColor: '#292600',
  },
  genderOptionText: {
    color: '#A5A8AE',
    fontSize: 15,
    fontWeight: '600',
  },
  genderOptionTextSelected: {
    color: '#FFEA00',
  },
  textInput: {
    minHeight: 66,
    paddingHorizontal: 17,
    borderWidth: 1,
    borderColor: '#292C30',
    borderRadius: 16,
    backgroundColor: '#121416',
    color: '#F5F5F5',
    fontSize: 19,
  },
  bioInputWrap: {
    minHeight: 126,
    paddingHorizontal: 17,
    paddingTop: 14,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: '#292C30',
    borderRadius: 16,
    backgroundColor: '#121416',
  },
  bioInput: {
    minHeight: 82,
    padding: 0,
    color: '#F5F5F5',
    fontSize: 18,
    lineHeight: 25,
  },
  bioCount: {
    alignSelf: 'flex-end',
    marginTop: 4,
    color: '#8B9098',
    fontSize: 13,
  },
  saveButton: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
    paddingHorizontal: 20,
    borderRadius: 21,
    backgroundColor: '#FFEA00',
    shadowColor: '#FFEA00',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  saveButtonText: {
    color: '#080808',
    fontSize: 19,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },
});
