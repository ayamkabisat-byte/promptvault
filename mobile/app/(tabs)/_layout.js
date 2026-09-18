import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { NavBarProvider, useNavBar } from '../../context/NavBarContext';

const ICONS = {
  index: require('../../assets/icons/home.svg'),
  fashion: require('../../assets/icons/fashion.svg'),
  favorites: require('../../assets/icons/heart.svg'),
};

function TabIcon({ routeName, focused }) {
  const size = routeName === 'fashion' ? 34 : routeName === 'favorites' ? 30 : 29;
  return (
    <View style={[styles.iconBubble, focused && styles.iconBubbleActive]}>
      <ExpoImage
        source={ICONS[routeName] || ICONS.index}
        style={{ width: size, height: size, opacity: focused ? 1 : 0.52 }}
        contentFit="contain"
      />
    </View>
  );
}

function FloatingTabBar({ state, descriptors, navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { compact, setCompact } = useNavBar();
  const progress = useRef(new Animated.Value(compact ? 1 : 0)).current;
  const fullWidth = Math.max(260, width - 28);
  const activeRoute = state.routes[state.index];

  useEffect(() => {
    Animated.spring(progress, {
      toValue: compact ? 1 : 0,
      useNativeDriver: false,
      friction: 10,
      tension: 88,
    }).start();
  }, [compact, progress]);

  const animatedWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [fullWidth, 58] });
  const animatedHeight = progress.interpolate({ inputRange: [0, 1], outputRange: [64, 58] });
  const animatedRadius = progress.interpolate({ inputRange: [0, 1], outputRange: [32, 29] });

  const pressRoute = (route, index) => {
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
          bottom: Math.max(14, insets.bottom + 10),
          width: animatedWidth,
          height: animatedHeight,
          borderRadius: animatedRadius,
        },
      ]}
    >
      {compact ? (
        <Pressable
          style={styles.compactButton}
          onPress={() => setCompact(false)}
          accessibilityRole="button"
          accessibilityLabel="Expand navigation"
        >
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
              onPress={() => pressRoute(route, index)}
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
    position: 'absolute', left: 14, zIndex: 100,
    backgroundColor: 'rgba(248,247,244,.72)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,.24)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000', shadowOpacity: .13, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 15,
    overflow: 'hidden',
  },
  tabButton: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  compactButton: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  iconBubble: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  iconBubbleActive: { backgroundColor: 'rgba(255,108,20,.13)' },
});
