import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../lib/theme';
import { useFavorites } from '../../context/FavoritesContext';
import { BentoFeed } from '../../components/VisualFeed';

export default function FavoritesScreen() {
  const router = useRouter();
  const { items } = useFavorites();

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {items.length ? (
        <BentoFeed
          items={items}
          keyFor={(entry) => entry.key}
          getImage={(entry) => {
            const item = entry.item;
            return entry.kind === 'fashion' ? (item.image_img2img_url || item.image_infographic_url) : item.image_url;
          }}
          onOpen={(entry) => router.push(entry.kind === 'fashion' ? `/fashion/${entry.item.id}` : `/prompt/${entry.item.id}`)}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>♡</Text>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>Open a prompt or fashion style, then tap Save.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 90, paddingHorizontal: 28 },
  emptyIcon: { color: colors.orange, fontSize: 62 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 8 },
  emptyText: { color: colors.muted, fontSize: 12, marginTop: 6, textAlign: 'center' },
});
