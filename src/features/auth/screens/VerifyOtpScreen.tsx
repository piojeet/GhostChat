import { adaptThemeColor, adaptThemeClassName } from '../../../theme/systemTheme';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList, MainStackParamList } from '../../../types/navigation';
import OtpInput from '../components/OtpInput';
import AuthHeader from '../components/AuthHeader';
import { authService } from '../services/authService';

const contentContainerStyle = {
  flexGrow: 1,
  justifyContent: 'center' as const,
  paddingHorizontal: 24,
  paddingTop: 18,
  paddingBottom: 30,
};

type Props =
  | NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>
  | NativeStackScreenProps<MainStackParamList, 'VerifyOtp'>;

type VerifyOtpScreenProps = Props & {
  onAuthenticated?: () => void;
  onPasswordOtpVerified: (email: string, otp: string) => void;
};

const VerifyOtpScreen = ({
  navigation,
  route,
  onAuthenticated,
  onPasswordOtpVerified,
}: VerifyOtpScreenProps) => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const email = route.params?.email ?? '';
  const purpose = route.params?.purpose ?? 'registration';

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Incomplete code', 'Enter the 6-digit verification code.');
      return;
    }

    if (!email) {
      Alert.alert('Email missing', 'Return to the previous screen and enter your email again.');
      return;
    }

    setIsVerifying(true);
    try {
      if (purpose === 'registration') {
        await authService.verifyRegistration({ email, otp });
        if (!onAuthenticated) {
          throw new Error('Registration verification is unavailable in this flow.');
        }
        onAuthenticated();
      } else {
        await authService.verifyPasswordOtp({ email, otp });
        onPasswordOtpVerified(email, otp);
      }
    } catch (error) {
      Alert.alert(
        'Verification failed',
        error instanceof Error ? error.message : 'Unable to verify this code. Please try again.',
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Email missing', 'Return to the previous screen and enter your email again.');
      return;
    }
    setIsResending(true);
    try {
      const result = await authService.resendOtp(email, purpose);
      Alert.alert('Code sent', result.message);
    } catch (error) {
      Alert.alert(
        'Resend failed',
        error instanceof Error ? error.message : 'Unable to resend the code. Please try again.',
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView className={adaptThemeClassName('flex-1 bg-[#080808]')}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentContainerStyle}
      >
        <AuthHeader
          title="Verify OTP"
          subtitle={`We sent a 6-digit code to ${email || 'your email'}`}
        />

        <View className="mt-10 items-center">
          <OtpInput value={otp} onChange={setOtp} length={6} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleVerifyOtp}
          disabled={isVerifying}
          className={adaptThemeClassName('mt-8 h-[50px] items-center justify-center rounded-full bg-[#FFEA00]')}
        >
          {isVerifying ? (
            <ActivityIndicator color={adaptThemeColor('#000000', 'color')} />
          ) : (
            <Text className={adaptThemeClassName('text-[18px] font-bold text-black')}>Verify</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handleResendCode}
          disabled={isResending}
          className="mt-6 items-center"
        >
          <Text className={adaptThemeClassName('text-[15px] text-[#A0A0A0]')}>
            {isResending ? 'Sending code...' : "Didn't receive a code? "}
            {!isResending && <Text className={adaptThemeClassName('font-bold text-[#FFEA00]')}>Resend</Text>}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          className="mt-6 items-center"
        >
          <Text className={adaptThemeClassName('text-[15px] font-semibold text-[#FFEA00]')}>
            Back
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VerifyOtpScreen;
