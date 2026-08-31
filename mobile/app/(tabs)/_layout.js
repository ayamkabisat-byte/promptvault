import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '../../lib/theme';

function icon(symbol, color, focused) {
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? 'rgba(255,145,56,.16)' : 'transparent' }}>
      <Text style={{ color, fontSize: symbol === '♡' ? 25 : 23, fontWeight: '700' }}>{symbol}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          left: 42,
          right: 42,
          bottom: 16,
          height: 64,
          borderRadius: 32,
          borderTopWidth: 0,
          backgroundColor: 'rgba(248,247,244,.97)',
          paddingHorizontal: 10,
          paddingTop: 6,
          paddingBottom: 6,
          shadowColor: '#000',
          shadowOpacity: .24,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 9 },
          elevation: 16,
        },
        tabBarItemStyle: { borderRadius: 26 },
        tabBarActiveTintColor: '#17181d',
        tabBarInactiveTintColor: '#747783',
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: ({ color, focused }) => icon('⌂', color, focused) }} />
      <Tabs.Screen name="fashion" options={{ title: 'Fashion', tabBarIcon: ({ color, focused }) => icon('✦', color, focused) }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites', tabBarIcon: ({ color, focused }) => icon('♡', color, focused) }} />
    </Tabs>
  );
}
