import { getSystemStatusBarStyle, adaptThemeClassName } from '../../../theme/systemTheme';
import {
  Image,
  Platform,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const interRegular = Platform.select({
  android: 'inter-latin-400-normal',
  ios: 'Inter',
});
const interSemibold = Platform.select({
  android: 'inter-latin-600-normal',
  ios: 'Inter',
});
const interBold = Platform.select({
  android: 'inter-latin-700-normal',
  ios: 'Inter',
});

const WelcomeScreen = ({ navigation }: Props) => {
  return (
    <View className={adaptThemeClassName('flex-1 justify-between bg-black px-8 py-16')}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />

      <View className="flex-1 justify-center">
        <View className="mb-8 flex-row items-center justify-center">
          <Image
            source={require('../../../assets/images/splash/snapapp-ghost.png')}
            resizeMode="contain"
            className="h-[150px] w-[150px]"
          />
        </View>
        <Text
          className={adaptThemeClassName('mt-5 text-[38px] font-bold leading-[48px] text-white text-center')}
          style={{ fontFamily: interBold }}
        >
          Your <Text style={{ color: '#fee004' }}>Moments</Text>,{'\n'}your{' '}
          <Text style={{ color: '#fee004' }}>People</Text>.
        </Text>
        <Text
          className={adaptThemeClassName('mt-4 text-[14px] leading-[25px] text-zinc-400 text-center')}
          style={{ fontFamily: interRegular }}
        >
          Share the little things and stay close to the people who matter.
        </Text>
      </View>

      <View className="gap-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Register')}
          className={adaptThemeClassName('min-h-[50px] items-center justify-center rounded-full bg-[#fee004] active:opacity-80')}
        >
          <Text
            className={adaptThemeClassName('text-[16px] font-bold text-black')}
            style={{ fontFamily: interBold }}
          >
            Create account
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Login')}
          className={adaptThemeClassName('min-h-[50px] items-center justify-center rounded-full border border-[#fee004] active:opacity-80')}
        >
          <Text
            className={adaptThemeClassName('text-[16px] font-semibold text-[#fee004]')}
            style={{ fontFamily: interSemibold }}
          >
            Log in
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default WelcomeScreen;
