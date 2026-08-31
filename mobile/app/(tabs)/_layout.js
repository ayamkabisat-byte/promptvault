import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { NavBarProvider, useNavBar } from '../../context/NavBarContext';

const SYMBOLS = { index: '⌂', fashion: '✦', favorites: '♡' };

function TabIcon({ routeName, focused }) {
  const symbol = SYMBOLS[routeName] || '•';
  return (
    <View style={[styles.iconBubble, focused && styles.iconBubbleActive]}>
      <Text style={[styles.iconText, routeName === 'favorites' && styles.heartIcon, focused && styles.iconTextActive]}>{symbol}</Text>
    </View>
  );
}

function FloatingTabBar({ state, descriptors, navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { compact, setCompact } = useNavBar();
  const progress = useRef(new Animated.Value(compact ? 1 : 0)).current;
  const fullWidth = Math.max(250, width - 32);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: compact ? 1 : 0,
      useNativeDriver: false,
      friction: 9,
      tension: 85,
    }).start();
  }, [compact, progress]);

  const animatedWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [fullWidth, 56] });
  const animatedHeight = progress.interpolate({ inputRange: [0, 1], outputRange: [64, 56] });
  const animatedRadius = progress.interpolate({ inputRange: [0, 1], outputRange: [32, 28] });
  const activeRoute = state.routes[state.index];

  const onPressRoute = (route, index) => {
    const focused = state.index === index;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    setCompact(false);
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          bottom: Math.max(10, insets.bottom + 8),
          width: animatedWidth,
          height: animatedHeight,
          borderRadius: animatedRadius,
        },
      ]}
    >
      {compact ? (
        <Pressable style={styles.compactButton} onPress={() => setCompact(false)} accessibilityRole="button" accessibilityLabel="Expand navigation">
          <TabIcon routeName={activeRoute.name} focused />
        </Pressable>
      ) : (
        state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              style={styles.tabButton}
              onPress={() => onPressRoute(route, index)}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || options.title || route.name}
            >
              <TabIcon routeName={route.name} focused={focused} />
            </Pressable>
          );
        })
      )}
    </Animated.View>
  );
}

function TabsShell() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover' }} />
      <Tabs.Screen name="fashion" options={{ title: 'Fashion' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites' }} />
    </Tabs>
  );
}

export default function TabsLayout() {
  return (
    <NavBarProvider>
      <TabsShell />
    </NavBarProvider>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: 16, zIndex: 80,
    backgroundColor: 'rgba(248,247,244,.97)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000', shadowOpacity: .24, shadowRadius: 22, shadowOffset: { width: 0, height: 9 }, elevation: 18,
    overflow: 'hidden',
  },
  tabButton: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' },
  compactButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  iconBubble: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  iconBubbleActive: { backgroundColor: 'rgba(255,145,56,.16)' },
  iconText: { color: '#71747f', fontSize: 24, fontWeight: '700' },
  heartIcon: { fontSize: 26 },
  iconTextActive: { color: '#17181d' },
});
