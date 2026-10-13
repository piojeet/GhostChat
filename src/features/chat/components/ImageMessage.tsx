import { createAdaptiveStyles } from '../../../theme/systemTheme';
import React from 'react';
import { Image, View } from 'react-native';

type Props = {
  uri: string;
};

const ImageMessage = ({ uri }: Props) => (
  <View style={styles.frame}>
    <Image
      accessibilityLabel="Photo message"
      source={{ uri }}
      resizeMode="cover"
      style={styles.image}
    />
  </View>
);

export default ImageMessage;

const styles = createAdaptiveStyles({
  frame: {
    width: 230,
    height: 230,
    overflow: 'hidden',
    borderRadius: 14,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#34373A',
  },
});
