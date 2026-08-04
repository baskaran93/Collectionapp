import { useEffect } from 'react';
import { Appearance, DeviceEventEmitter } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '../constants/i18n';
import ErrorBoundary from '../components/ErrorBoundary';

// Force light mode on supported platforms so the app's fixed light theme isn't overridden.
if (Appearance?.setColorScheme) {
  Appearance.setColorScheme('light');
}

export default function RootLayout() {
  // Logout is triggered from deep inside the (tabs) navigator. Handling the
  // resulting navigation here, at the true root, avoids ambiguity around
  // which navigator a nested router.replace()/dismissTo() call would target.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('app:logout', () => {
      router.replace('/');
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <StatusBar style="light" />
          <ErrorBoundary>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="party/[id]" />
              <Stack.Screen name="loan/[id]" />
              <Stack.Screen name="collection/[id]" />
              <Stack.Screen name="user/index" />
              <Stack.Screen name="user/[id]" />
              <Stack.Screen name="+not-found" />
              <Stack.Screen name="settings/index" />
              <Stack.Screen name="settings/language" />
              <Stack.Screen name="settings/change-password" />
            </Stack>
          </ErrorBoundary>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
