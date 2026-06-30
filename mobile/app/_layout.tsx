import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AnimatedGradient from '../components/AnimatedGradient';
import { notificationService } from '../services/notifications';

export default function RootLayout() {
  useEffect(() => {
    notificationService.registerForPushNotifications();
    notificationService.scheduleWeeklyReminder();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="transparent" />
      <AnimatedGradient />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
