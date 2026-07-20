import { Appearance } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '../constants/i18n';

// Force light mode on supported platforms so the app's fixed light theme isn't overridden.
if (Appearance?.setColorScheme) {
  Appearance.setColorScheme('light');
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="party/[id]" />
            <Stack.Screen name="loan/[id]" />
            <Stack.Screen name="collection/[id]" />
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="settings" />
          </Stack>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
