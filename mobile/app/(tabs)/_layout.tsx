import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, iconSize } from '../../theme';
import { AppIcon } from '../../components/ui/AppIcon';
import type { IconName } from '../../components/ui/AppIcon';

function TabIcon({ focused, icon, label }: { focused: boolean; icon: IconName; label: string }) {
  return (
    <View style={tabIconStyles.container}>
      <AppIcon
        name={icon}
        size={focused ? iconSize.lg : iconSize.md}
        color={focused ? colors.accentRed : colors.textSecondary}
      />
      <Text style={[tabIconStyles.label, focused && tabIconStyles.labelFocused]}>
        {label}
      </Text>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: spacing.xs,
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  labelFocused: {
    color: colors.accentRed,
    fontWeight: '600',
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 64,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="wine" label="Abbina" />
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
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="history" label="Cronologia" />
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
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="settings" label="Impostazioni" />
          ),
        }}
      />
    </Tabs>
  );
}
