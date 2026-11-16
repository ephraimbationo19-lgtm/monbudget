import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDataProvider } from '@/context/AppDataContext';
import { initDatabase } from '@/db/schema';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="dark" />
        <SQLiteProvider databaseName="monbudget.db" onInit={initDatabase}>
          <AppDataProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </AppDataProvider>
        </SQLiteProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
