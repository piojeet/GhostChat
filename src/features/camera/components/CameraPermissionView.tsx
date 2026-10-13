import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { createAdaptiveStyles } from '../../../theme/systemTheme';

type Props = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
};

const CameraPermissionView = ({
  message,
  actionLabel,
  onAction,
  loading = false,
}: Props) => (
  <View style={styles.container}>
    {loading && <ActivityIndicator color="#FFEA00" size="large" />}
    <Text accessibilityRole="text" style={styles.message}>{message}</Text>
    {actionLabel && onAction && (
      <Pressable
        accessibilityRole="button"
        onPress={onAction}
        style={styles.action}
      >
        <Text style={styles.actionText}>{actionLabel}</Text>
      </Pressable>
    )}
  </View>
);

export default CameraPermissionView;

const styles = createAdaptiveStyles({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#080808',
  },
  message: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  action: {
    minHeight: 48,
    marginTop: 20,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#FFEA00',
  },
  actionText: {
    color: '#080808',
    fontSize: 15,
    fontWeight: '700',
  },
});