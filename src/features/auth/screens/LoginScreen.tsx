import { adaptThemeColor, adaptThemeClassName } from '../../../theme/systemTheme';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthHeader from '../components/AuthHeader';
import AuthInput from '../components/AuthInput';
import PasswordInput from '../components/PasswordInput';
import SocialLoginButton from '../../../assets/icons/social/SocialLoginButton';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../types/navigation';
import { authService } from '../services/authService';

const contentContainerStyle = {
  flexGrow: 1,
  justifyContent: 'center' as const,
  paddingHorizontal: 24,
  paddingTop: 25,
  paddingBottom: 30,
};

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'> & {
  onAuthenticated?: () => void;
};

const LoginScreen = ({ navigation, onAuthenticated }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        'Missing details',
        'Enter your email and password.',
      );
      return;
    }

    setIsLoading(true);
    try {
      await authService.login({ email: email.trim(), password });
      onAuthenticated?.();
    } catch (error) {
      Alert.alert(
        'Sign in failed',
        error instanceof Error ? error.message : 'Unable to sign in. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert(
      `${provider} sign-in unavailable`,
      'Social sign-in is not configured yet.',
    );
  };

  return (
    <SafeAreaView className={adaptThemeClassName('flex-1 bg-[#080808]')}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentContainerStyle}
      >
        {/* Header */}
        <View className="flex-row items-center justify-center">
          <Image
            source={require('../../../assets/images/splash/snapapp-ghost.png')}
            resizeMode="contain"
            className="h-[100px] w-[100px]"
          />
        </View>
        <AuthHeader title="Welcome Back" subtitle="Sign in to continue" />

        {/* Form */}
        <View className="mt-12">
          <AuthInput
            icon="email"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <View className="mt-4">
            <PasswordInput value={password} onChangeText={setPassword} />
          </View>

          {/* Forgot password */}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ForgotPassword')}
            className="mt-4 self-end"
          >
            <Text className={adaptThemeClassName('text-[15px] font-semibold text-[#4A8DFF]')}>
              Forgot Password?
            </Text>
          </Pressable>

          {/* Sign in */}
          <Pressable
            accessibilityRole="button"
            onPress={handleLogin}
            disabled={isLoading}
            className={adaptThemeClassName('mt-8 h-[50px] items-center justify-center rounded-full bg-[#FFEA00]')}
          >
            {isLoading ? (
              <ActivityIndicator color={adaptThemeColor('#000000', 'color')} />
            ) : (
              <Text className={adaptThemeClassName('text-[18px] font-bold text-black')}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Divider */}
        <View className="mt-8 items-center">
          <Text className={adaptThemeClassName('text-[15px] text-[#A0A0A0]')}>or continue with</Text>
        </View>

        {/* Social */}
        <View className="mt-5 flex-row justify-center gap-5">
          <SocialLoginButton
            type="google"
            onPress={() => handleSocialLogin('Google')}
          />
          <SocialLoginButton
            type="apple"
            onPress={() => handleSocialLogin('Apple')}
          />
          <SocialLoginButton
            type="facebook"
            onPress={() => handleSocialLogin('Facebook')}
          />
        </View>

        {/* Register */}
        <View className="mt-8 flex-row items-center justify-center">
          <Text className={adaptThemeClassName('text-[15px] text-[#A0A0A0]')}>
            Don't have an account?
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Register')}
            className="ml-1"
          >
            <Text className={adaptThemeClassName('text-[15px] font-bold text-[#FFEA00]')}>
              Sign Up
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;
