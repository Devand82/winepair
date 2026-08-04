import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { colors, spacing, iconSize } from '../../theme';
import { AppIcon } from '../../components/ui/AppIcon';
import type { IconName } from '../../components/ui/AppIcon';

function TabIcon({ focused, icon }: { focused: boolean; icon: IconName }) {
  return (
    <AppIcon
      name={icon}
      size={focused ? iconSize.lg : iconSize.md}
      color={focused ? colors.accentRed : colors.textSecondary}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          color: colors.textSecondary,
          marginBottom: spacing.xxs,
        },
        tabBarActiveTintColor: colors.accentRed,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Abbina',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="wine" />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          headerShown: true,
          headerTitle: 'Cronologia',
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: {
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 20,
            color: colors.textPrimary,
          },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          tabBarLabel: 'Cronologia',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="history" />
          ),
        }}
      />
      <Tabs.Screen
        name="cellar"
        options={{
          headerShown: true,
          headerTitle: 'Cantina',
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: {
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 20,
            color: colors.textPrimary,
          },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          tabBarLabel: 'Cantina',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="grape" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerShown: true,
          headerTitle: 'Impostazioni',
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: {
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 20,
            color: colors.textPrimary,
          },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          tabBarLabel: 'Impostazioni',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="settings" />
          ),
        }}
      />
    </Tabs>
  );
}
