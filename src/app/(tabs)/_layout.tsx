import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_ICONS: Record<string, IconName> = {
  index: 'view-dashboard',
  transactions: 'receipt',
  budgets: 'chart-pie',
  goals: 'target',
  debts: 'cash',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62,
        },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={TAB_ICONS[route.name] ?? 'circle'}
            size={size}
            color={typeof color === 'string' ? color : colors.muted}
          />
        ),
      })}>
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets' }} />
      <Tabs.Screen name="goals" options={{ title: 'Objectifs' }} />
      <Tabs.Screen name="debts" options={{ title: 'Dettes' }} />
    </Tabs>
  );
}
