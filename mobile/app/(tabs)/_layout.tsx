import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

function TabIcon({ focused, emoji, label }: { focused: boolean; emoji: string; label: string }) {
  return (
    <View style={tabIcon.container}>
      <Text style={[tabIcon.emoji, focused && tabIcon.emojiFocused]}>{emoji}</Text>
      <Text style={[tabIcon.label, focused && tabIcon.labelFocused]}>{label}</Text>
    </View>
  );
}

const tabIcon = StyleSheet.create({
  container: { alignItems: 'center', gap: 2 },
  emoji: { fontSize: 20 },
  emojiFocused: { fontSize: 24 },
  label: { fontSize: 10, color: '#5c5248', fontWeight: '400' },
  labelFocused: { color: '#c4667a', fontWeight: '700' },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#191512',
          borderTopColor: '#2c271f',
          borderTopWidth: 1,
          height: 72,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🍷" label="Abbina" />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          headerShown: true,
          headerTitle: 'Cronologia',
          headerStyle: { backgroundColor: '#191512' },
          headerTintColor: '#e8e0d4',
          headerTitleStyle: { fontFamily: 'serif', fontSize: 20, color: '#e8e0d4', fontWeight: '700' },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="📋" label="Cronologia" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerShown: true,
          headerTitle: 'Impostazioni',
          headerStyle: { backgroundColor: '#191512' },
          headerTintColor: '#e8e0d4',
          headerTitleStyle: { fontFamily: 'serif', fontSize: 20, color: '#e8e0d4', fontWeight: '700' },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="⚙️" label="Impostazioni" />,
        }}
      />
    </Tabs>
  );
}
