import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

const MESSAGES = [
  'Analizzando i profili aromatici…',
  'Consultando le regole di abbinamento…',
  'Valutando struttura e mineralità…',
  'Scegliendo il vino ideale dal menù…',
  'Quasi pronto…',
];

function BounceDot({ delay }: { delay: number }) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, {
          toValue: -10,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, translateY]);

  return (
    <Animated.View
      style={[styles.dot, { transform: [{ translateY }] }]}
    />
  );
}

export default function LoadingWine() {
  const wineOpacity = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wineOpacity, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(wineOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [wineOpacity]);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      setMsgIdx((prev) => (prev + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [textOpacity]);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.emoji, { opacity: wineOpacity }]}>
        🍷
      </Animated.Text>
      <Animated.Text style={[styles.message, { opacity: textOpacity }]}>
        {MESSAGES[msgIdx]}
      </Animated.Text>
      <View style={styles.dotsRow}>
        <BounceDot delay={0} />
        <BounceDot delay={200} />
        <BounceDot delay={400} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#13100d',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 0,
  },
  message: {
    fontSize: 15,
    color: '#9a8e7e',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
    marginVertical: 32,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c4667a',
  },
});
