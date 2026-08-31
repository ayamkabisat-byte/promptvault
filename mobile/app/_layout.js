import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FavoritesProvider } from '../context/FavoritesContext';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <FavoritesProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="prompt/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="fashion/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </FavoritesProvider>
  );
}
