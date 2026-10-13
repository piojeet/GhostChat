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
  paddingTop: 18,
  paddingBottom: 25,
};

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      Alert.alert(
        'Missing details',
        'Complete all fields to create an account.',
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.register({
        username: username.trim(),
        email: email.trim(),
        password,
        displayName: fullName.trim(),
      });
      navigation.navigate('VerifyOtp', {
        email: email.trim().toLowerCase(),
        purpose: 'registration',
      });
    } catch (error) {
      Alert.alert(
        'Registration failed',
        error instanceof Error ? error.message : 'Unable to create your account. Please try again.',
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
        <View className="flex-row items-center justify-center">
          <Image
            source={require('../../../assets/images/splash/snapapp-ghost.png')}
            resizeMode="contain"
            className="h-[100px] w-[100px]"
          />
        </View>
        {/* Header */}
        <AuthHeader
          title="Create Account"
          subtitle="Join and connect with your friends"
        />

        {/* Form */}
        <View className="mt-8">
          <AuthInput
            icon="user"
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
          />

          <View className="mt-3">
            <AuthInput
              icon="username"
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View className="mt-3">
            <AuthInput
              icon="email"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View className="mt-3">
            <PasswordInput value={password} onChangeText={setPassword} />
          </View>

          {/* Create account */}
          <Pressable
            accessibilityRole="button"
            onPress={handleRegister}
            disabled={isLoading}
            className={adaptThemeClassName('mt-8 h-[50px] items-center justify-center rounded-full bg-[#FFEA00]')}
          >
            {isLoading ? (
              <ActivityIndicator color={adaptThemeColor('#000000', 'color')} />
            ) : (
              <Text className={adaptThemeClassName('text-[18px] font-bold text-black')}>
                Create Account
              </Text>
            )}
          </Pressable>
        </View>

        {/* Divider */}
        <View className="mt-7 items-center">
          <Text className={adaptThemeClassName('text-[15px] text-[#A0A0A0]')}>or continue with</Text>
        </View>

        {/* Social */}
        <View className="mt-4 flex-row justify-center gap-5">
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

        {/* Login */}
        <View className="mt-6 flex-row items-center justify-center">
          <Text className={adaptThemeClassName('text-[15px] text-[#A0A0A0]')}>
            Already have an account?
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Login')}
            className="ml-1"
          >
            <Text className={adaptThemeClassName('text-[15px] font-bold text-[#FFEA00]')}>
              Sign In
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RegisterScreen;
