import { adaptThemeColor, createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  AuthStackParamList,
  MainStackParamList,
} from '../../../types/navigation';
import { authService } from '../services/authService';

type Props =
  | NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>
  | NativeStackScreenProps<MainStackParamList, 'ResetPassword'>;

type ResetPasswordScreenProps = Props & {
  onPasswordReset?: () => void;
};

const passwordRules = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  {
    label: 'One special character',
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
];

const ResetPasswordScreen = ({
  navigation,
  route,
  onPasswordReset,
}: ResetPasswordScreenProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const email = route.params?.email;
  const otp = route.params?.otp;
  const isPasswordValid = passwordRules.every(rule => rule.test(password));

  const handleResetPassword = async () => {
    if (!isPasswordValid) {
      Alert.alert('Password requirements', 'Please meet all password requirements.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same password in both fields.');
      return;
    }

    if (!email || !otp) {
      Alert.alert(
        'Verification required',
        'Request a password reset code and verify it before setting a new password.',
      );
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({ email, otp, password });
      Alert.alert('Password updated', 'Your password has been updated.', [
        {
          text: 'Continue',
          onPress: onPasswordReset ?? (() => navigation.goBack()),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Password reset failed',
        error instanceof Error ? error.message : 'Unable to reset your password. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="chevron-left" size={29} color={adaptThemeColor('#FFFFFF', 'color')} />
            </Pressable>
            <Text style={styles.title}>Reset Password</Text>
          </View>

          <View style={styles.hero}>
            <View style={styles.outerGlow}>
              <View style={styles.lockCircle}>
                <Icon name="lock" size={52} color={adaptThemeColor('#E8FFF9', 'color')} />
              </View>
            </View>
            <Text style={styles.subtitle}>
              Create a new password for your account
            </Text>
          </View>

          <View style={styles.form}>
            <PasswordField
              label="New Password"
              value={password}
              visible={passwordVisible}
              onChangeText={setPassword}
              onToggleVisibility={() => setPasswordVisible(visible => !visible)}
            />
            <PasswordField
              label="Confirm Password"
              value={confirmPassword}
              visible={confirmVisible}
              onChangeText={setConfirmPassword}
              onToggleVisibility={() => setConfirmVisible(visible => !visible)}
            />

            <View style={styles.rulesCard}>
              {passwordRules.map(rule => {
                const passed = rule.test(password);
                return (
                  <View key={rule.label} style={styles.ruleRow}>
                    <View
                      style={[
                        styles.ruleIcon,
                        !passed && styles.ruleIconPending,
                      ]}
                    >
                      <Icon
                        name={passed ? 'check' : 'circle'}
                        size={passed ? 17 : 8}
                        color={passed ? '#FFFFFF' : '#76767E'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.ruleText,
                        passed && styles.ruleTextPassed,
                      ]}
                    >
                      {rule.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.mismatchText}>Passwords do not match</Text>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={handleResetPassword}
              disabled={isLoading}
              style={styles.resetButton}
            >
              {isLoading ? (
                <ActivityIndicator color={adaptThemeColor('#050505', 'color')} />
              ) : (
                <>
                  <Text style={styles.resetButtonText}>Reset Password</Text>
                  <Icon name="arrow-right" size={23} color={adaptThemeColor('#050505', 'color')} />
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

type PasswordFieldProps = {
  label: string;
  value: string;
  visible: boolean;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
};

const PasswordField = ({
  label,
  value,
  visible,
  onChangeText,
  onToggleVisibility,
}: PasswordFieldProps) => (
  <View style={styles.passwordField}>
    <Icon name="lock" size={22} color={adaptThemeColor('#FFFFFF', 'color')} />
    <TextInput
      accessibilityLabel={label}
      autoCapitalize="none"
      autoCorrect={false}
      onChangeText={onChangeText}
      placeholder={label}
      placeholderTextColor={adaptThemeColor('#A4A4AE', 'color')}
      returnKeyType="done"
      secureTextEntry={!visible}
      style={styles.input}
      value={value}
    />
    <Pressable
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      accessibilityRole="button"
      hitSlop={10}
      onPress={onToggleVisibility}
    >
      <Icon name={visible ? 'eye' : 'eye-off'} size={22} color={adaptThemeColor('#85858E', 'color')} />
    </Pressable>
  </View>
);

export default ResetPasswordScreen;

const styles = createAdaptiveStyles({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#080909',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  header: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 38,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 21,
    paddingBottom: 26,
  },
  outerGlow: {
    width: 154,
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 77,
    borderWidth: 1,
    borderColor: 'rgba(0, 237, 183, 0.18)',
    backgroundColor: 'rgba(0, 237, 183, 0.035)',
  },
  lockCircle: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 58,
    borderWidth: 3,
    borderColor: '#00D7A5',
    backgroundColor: 'rgba(0, 215, 165, 0.07)',
  },
  subtitle: {
    marginTop: 18,
    color: '#C6C6D0',
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    gap: 14,
  },
  passwordField: {
    height: 61,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292A2D',
    backgroundColor: '#111213',
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 17,
    paddingVertical: 0,
    color: '#FFFFFF',
    fontSize: 15,
  },
  rulesCard: {
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#242528',
    backgroundColor: '#101112',
  },
  ruleRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#00B88C',
  },
  ruleIconPending: {
    backgroundColor: '#252629',
  },
  ruleText: {
    marginLeft: 13,
    color: '#B4B4BE',
    fontSize: 14,
  },
  ruleTextPassed: {
    color: '#E1E1E5',
  },
  mismatchText: {
    marginTop: -6,
    color: '#FF666D',
    fontSize: 13,
  },
  resetButton: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#FFEA00',
    shadowColor: '#FFEA00',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  resetButtonText: {
    flex: 1,
    marginLeft: 23,
    color: '#050505',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
});
