import { adaptThemeColor, adaptThemeClassName } from '../../../theme/systemTheme';
import React from 'react';
import { TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

type AuthInputProps = {
  icon: 'email' | 'user' | 'username';
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  keyboardType?: KeyboardTypeOptions;
};

const icons: Record<AuthInputProps['icon'], string> = {
  email: 'mail',
  user: 'user',
  username: 'at-sign',
};

const AuthInput = ({
  icon,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
}: AuthInputProps) => (
  <View className={adaptThemeClassName('h-[58px] flex-row items-center rounded-[14px] border border-[#292929] bg-[#191919] px-4')}>
    <Icon name={icons[icon]} size={19} color={adaptThemeColor('#888888', 'color')} />
    <TextInput
      accessibilityLabel={placeholder}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      className={adaptThemeClassName('ml-3 flex-1 py-0 text-[16px] text-white')}
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={adaptThemeColor('#777777', 'color')}
      returnKeyType="next"
      value={value}
    />
  </View>
);

export default AuthInput;
