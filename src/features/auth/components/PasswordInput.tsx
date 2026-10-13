import { adaptThemeColor, adaptThemeClassName } from '../../../theme/systemTheme';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

type PasswordInputProps = {
  value: string;
  onChangeText: (value: string) => void;
};

const PasswordInput = ({ value, onChangeText }: PasswordInputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View className={adaptThemeClassName('h-[58px] flex-row items-center rounded-[14px] border border-[#292929] bg-[#191919] px-4')}>
      <Icon name="lock" size={19} color={adaptThemeColor('#888888', 'color')} />
      <TextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoCorrect={false}
        className={adaptThemeClassName('ml-3 flex-1 py-0 text-[16px] text-white')}
        onChangeText={onChangeText}
        placeholder="Password"
        placeholderTextColor={adaptThemeColor('#777777', 'color')}
        returnKeyType="done"
        secureTextEntry={!isPasswordVisible}
        value={value}
      />
      <Pressable
        accessibilityLabel={
          isPasswordVisible ? 'Hide password' : 'Show password'
        }
        accessibilityRole="button"
        onPress={() => setIsPasswordVisible(visible => !visible)}
        hitSlop={10}
      >
        <Icon
          name={isPasswordVisible ? 'eye-off' : 'eye'}
          size={19}
          color={adaptThemeColor('#888888', 'color')}
        />
      </Pressable>
    </View>
  );
};

export default PasswordInput;
