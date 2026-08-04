import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

const COLORS = ['#13100d', '#1a1511', '#191512', '#1e1814'] as const;

export default function AnimatedGradient() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 8000 }),
      -1,
      true,
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.33, 0.66, 1],
      COLORS,
    ) as string,
  }));

  return <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]} pointerEvents="none" />;
}
