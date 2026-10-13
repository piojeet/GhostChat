import { createAdaptiveStyles } from '../../../theme/systemTheme';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

const TypingIndicator = () => {
  const animations = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const loops = animations.map((value, index) => Animated.loop(
      Animated.sequence([
        Animated.delay(index * 150),
        Animated.timing(value, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.delay((2 - index) * 150),
      ]),
    ));
    loops.forEach(animation => animation.start());

    return () => loops.forEach(animation => animation.stop());
  }, [animations]);

  return (
    <View accessibilityLabel="Friend is typing" style={styles.container}>
      {animations.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              opacity: value.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
              transform: [{
                translateY: value.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -4],
                }),
              }],
            },
          ]}
        />
      ))}
      <Text style={styles.label}>Typing</Text>
    </View>
  );
};

export default TypingIndicator;

const styles = createAdaptiveStyles({
  container: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 42,
    marginVertical: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#242629',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFEA00',
  },
  label: {
    marginLeft: 3,
    color: '#C3C5C7',
    fontSize: 11,
  },
});
