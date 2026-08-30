import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../lib/theme';
import { useFavorites } from '../../context/FavoritesContext';

export default function FavoritesScreen() {
  const router = useRouter();
  const { items, toggle } = useFavorites();

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>Saved for this app session · persistent storage comes next.</Text>
      </View>
      {items.length ? (
        <FlatList
          data={items}
          keyExtractor={(entry) => entry.key}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item: entry }) => {
            const item = entry.item;
            const cover = entry.kind === 'fashion' ? (item.image_img2img_url || item.image_infographic_url) : item.image_url;
            return (
              <Pressable style={styles.card} onPress={() => router.push(entry.kind === 'fashion' ? `/fashion/${item.id}` : `/prompt/${item.id}`)}>
                <View style={styles.media}>{cover ? <Image source={{ uri: cover }} style={styles.image} /> : null}</View>
                <View style={styles.line}><Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text><Pressable onPress={() => toggle(item, entry.kind)}><Text style={styles.remove}>×</Text></Pressable></View>
                <Text style={styles.kind}>{entry.kind === 'fashion' ? 'FASHION' : 'PROMPT'}</Text>
              </Pressable>
            );
          }}
        />
      ) : (
        <View style={styles.empty}><Text style={styles.emptyIcon}>♡</Text><Text style={styles.emptyTitle}>No favorites yet</Text><Text style={styles.emptyText}>Tap the heart on a prompt or fashion look.</Text></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 4 },
  list: { paddingHorizontal: 10, paddingBottom: 24 },
  row: { gap: 10 },
  card: { flex: 1, minWidth: 0, marginBottom: 16 },
  media: { width: '100%', aspectRatio: 0.76, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.panel },
  image: { width: '100%', height: '100%' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  cardTitle: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 12 },
  remove: { color: colors.muted, fontSize: 20, lineHeight: 20 },
  kind: { color: colors.dim, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyIcon: { color: colors.orange, fontSize: 52 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 8 },
  emptyText: { color: colors.muted, fontSize: 11, marginTop: 5 },
});
