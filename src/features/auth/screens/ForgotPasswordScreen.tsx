import { adaptThemeColor, adaptThemeClassName } from '../../../theme/systemTheme';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../types/navigation';
import AuthHeader from '../components/AuthHeader';
import AuthInput from '../components/AuthInput';
import { authService } from '../services/authService';


const contentContainerStyle = {
  flexGrow: 1,
  justifyContent: 'center' as const,
  paddingHorizontal: 24,
  paddingTop: 18,
  paddingBottom: 25,
};

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen = ({ navigation }: Props) => {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleResetRequest = async () => {
    if (!email.trim()) {
      Alert.alert(
        'Email required',
        'Enter the email address associated with your account.',
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      navigation.navigate('VerifyOtp', {
        email: email.trim().toLowerCase(),
        purpose: 'password-reset',
      });
    } catch (error) {
      Alert.alert(
        'Request failed',
        error instanceof Error ? error.message : 'Unable to send a verification code. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className={adaptThemeClassName('flex-1 bg-[#080808]')}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentContainerStyle}
      >
        <AuthHeader
          title="Reset Password"
          subtitle="Enter your account email to get started."
        />
        <View className="mt-10">
          <AuthInput
            icon="email"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Pressable
            accessibilityRole="button"
            className={adaptThemeClassName('mt-6 h-[58px] items-center justify-center rounded-full bg-[#FFEA00]')}
            onPress={handleResetRequest}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={adaptThemeColor('#000000', 'color')} />
            ) : (
              <Text className={adaptThemeClassName('text-[17px] font-bold text-black')}>
                Send verification code
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="mt-6 items-center"
            onPress={() => navigation.goBack()}
          >
            <Text className={adaptThemeClassName('text-[15px] font-semibold text-[#FFEA00]')}>
              Back to sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
