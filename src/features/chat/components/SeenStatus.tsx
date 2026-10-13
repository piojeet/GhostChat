import { createAdaptiveStyles } from '../../../theme/systemTheme';
import React from 'react';
import { Text, View } from 'react-native';

type Props = {
  deliveredAt: string | null;
  readAt: string | null;
};

const SeenStatus = ({ deliveredAt, readAt }: Props) => (
  <View style={styles.container}>
    <Text style={[styles.text, readAt && styles.read]}>
      {readAt ? 'Read' : deliveredAt ? 'Delivered' : 'Sent'}
    </Text>
  </View>
);

export default SeenStatus;

const styles = createAdaptiveStyles({
  container: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  text: {
    color: '#9B9FA3',
    fontSize: 10,
  },
  read: {
    color: '#FFEA00',
  },
});
