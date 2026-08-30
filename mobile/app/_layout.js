import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { FavoritesProvider } from '../context/FavoritesContext';
import { colors } from '../lib/theme';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const hideSystemNavigation = () => {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    };

    hideSystemNavigation();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') hideSystemNavigation();
    });

    return () => sub.remove();
  }, []);

  return (
    <FavoritesProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="prompt/[id]" options={{ title: 'Prompt', presentation: 'card' }} />
        <Stack.Screen name="fashion/[id]" options={{ title: 'Fashion Style', presentation: 'card' }} />
      </Stack>
    </FavoritesProvider>
  );
}
