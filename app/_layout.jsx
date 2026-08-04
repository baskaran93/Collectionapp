import { useEffect } from 'react';
import { Appearance, DeviceEventEmitter } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '../constants/i18n';
import { ThemeProvider, useTheme } from '../constants/theme';
import ErrorBoundary from '../components/ErrorBoundary';

// Force a fixed color scheme on supported platforms so the OS's dark mode
// doesn't fight with our own in-app theme toggle (constants/theme.js).
if (Appearance?.setColorScheme) {
  Appearance.setColorScheme('light');
}

function RootStack() {
  const { isDark } = useTheme();

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
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
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
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <ThemeProvider>
            <RootStack />
          </ThemeProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
