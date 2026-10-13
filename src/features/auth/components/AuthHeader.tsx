import { adaptThemeClassName } from '../../../theme/systemTheme';
import React from 'react';
import { Text, View } from 'react-native';

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

const AuthHeader = ({ title, subtitle }: AuthHeaderProps) => (
  <View>
    <Text className={adaptThemeClassName('text-[30px] font-bold text-white text-center')}>{title}</Text>
    <Text className={adaptThemeClassName('mt-2 text-[15px] text-[#A0A0A0] text-center')}>{subtitle}</Text>
  </View>
);

export default AuthHeader;
