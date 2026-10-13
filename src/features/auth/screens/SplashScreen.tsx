import { getSystemStatusBarStyle, adaptThemeClassName } from '../../../theme/systemTheme';
import { Image, StatusBar, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../../../types/navigation'

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>

const SplashScreen = ({ navigation }: Props) => {
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigation.replace('Onboarding')
    }, 1800)

    return () => clearTimeout(timeout)
  }, [navigation])

  return (
    <View className={adaptThemeClassName('flex-1 bg-[#000]')}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />

      {/* Main Content */}
      <View className="flex-1 items-center justify-center">

        {/* Ghost Logo */}
        <Image
          source={require('../../../assets/images/splash/snapapp-ghost.png')}
          className="h-[130px] w-[130px]"
          resizeMode="contain"
        />

        {/* App Name */}
        <View className="mt-[-4px] flex-row items-center">
          <Text className={adaptThemeClassName('text-[43px] font-bold text-white')}>
            Snap
          </Text>

          <Text className="text-[43px] font-bold text-yellow-400">
            App
          </Text>
        </View>

        {/* Tagline */}
        <Text className={adaptThemeClassName('mt-2 text-[19px] font-medium text-gray-400')}>
          Share Real Moments
        </Text>

      </View>

      {/* Bottom Waves */}
      <Image
        source={require('../../../assets/images/splash/splash-waves.png')}
        className="absolute bottom-0 left-0 right-0 h-[250px] w-full"
        resizeMode="cover"
      />
    </View>
  )
}

export default SplashScreen
