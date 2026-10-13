import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import FemaleAvatarImage from '../../../assets/images/avatars/female.svg';
import MaleAvatarImage from '../../../assets/images/avatars/male.svg';
import NeutralAvatarImage from '../../../assets/images/avatars/neutral.svg';

type Props = {
  avatar?: string | null;
  gender?: 'male' | 'female' | null;
  size: number;
};

const GenderAvatar = ({ avatar, gender, size }: Props) => {
  const Placeholder = gender === 'female'
    ? FemaleAvatarImage
    : gender === 'male'
      ? MaleAvatarImage
      : NeutralAvatarImage;

  return (
    <View
      accessibilityRole="image"
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {avatar ? (
        <Image
          resizeMode="cover"
          source={{ uri: avatar }}
          style={{
            width: size * 0.88,
            height: size * 0.88,
            borderRadius: size / 2,
          }}
        />
      ) : (
        <Placeholder width={size} height={size} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
  },
});

export default GenderAvatar;
