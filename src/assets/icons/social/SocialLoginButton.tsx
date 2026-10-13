import { adaptThemeClassName } from '../../../theme/systemTheme';
import React from 'react';
import { Pressable } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import AppleIcon from './apple.svg';
import FacebookIcon from './facebook.svg';
import GoogleIcon from './google.svg';

type SocialProvider = 'google' | 'apple' | 'facebook';

type SocialLoginButtonProps = {
  type: SocialProvider;
  onPress: () => void;
};

const providers: Record<
  SocialProvider,
  { Icon: React.ComponentType<SvgProps>; label: string }
> = {
  google: { Icon: GoogleIcon, label: 'Google' },
  apple: { Icon: AppleIcon, label: 'Apple' },
  facebook: { Icon: FacebookIcon, label: 'Facebook' },
};

const SocialLoginButton = ({ type, onPress }: SocialLoginButtonProps) => {
  const provider = providers[type];
  const Icon = provider.Icon;

  return (
    <Pressable
      accessibilityLabel={`Continue with ${provider.label}`}
      accessibilityRole="button"
      className={adaptThemeClassName('h-[58px] w-[82px] items-center justify-center rounded-[16px] border border-[#292929] bg-[#191919] active:opacity-70')}
      onPress={onPress}
    >
      <Icon width={24} height={24} />
    </Pressable>
  );
};

export default SocialLoginButton;
