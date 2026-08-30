import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { useFavorites } from '../../context/FavoritesContext';

function Card({ item, onOpen, favorite, onFavorite }) {
  return (
    <Pressable style={styles.card} onPress={onOpen}>
      <View style={styles.media}>
        <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
        <Pressable style={styles.heart} onPress={(e) => { e.stopPropagation?.(); onFavorite(); }}>
          <Text style={[styles.heartText, favorite && styles.heartActive]}>{favorite ? '♥' : '♡'}</Text>
        </Pressable>
      </View>
      <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
      <Text numberOfLines={1} style={styles.cardMeta}>{item.medium || 'Prompt'} · {item.category || item.model || 'AI'}</Text>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { toggle, has } = useFavorites();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prompts')
      .select('id,title,description,image_url,model,medium,category,tags,status,is_featured')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(600);
    if (!error) setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => `${item.title || ''} ${item.category || ''} ${item.medium || ''} ${(item.tags || []).join(' ')}`.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View><Text style={styles.brand}>Prompt<Text style={styles.accent}>Vault</Text></Text><Text style={styles.subtitle}>Native mobile preview</Text></View>
        <Text style={styles.count}>{filtered.length}</Text>
      </View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search prompts, styles, tags…" placeholderTextColor={colors.dim} style={styles.search} />
      {loading ? <ActivityIndicator color={colors.orange} style={{ marginTop: 60 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card
              item={item}
              favorite={has(item.id, 'prompt')}
              onFavorite={() => toggle(item, 'prompt')}
              onOpen={() => router.push(`/prompt/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  brand: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -1.2 },
  accent: { color: colors.orange },
  subtitle: { color: colors.muted, marginTop: 2, fontSize: 11 },
  count: { color: colors.dim, fontWeight: '800' },
  search: { height: 44, marginHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: '#0d0d12', color: colors.text, borderRadius: 14, paddingHorizontal: 14 },
  list: { paddingHorizontal: 10, paddingBottom: 24 },
  row: { gap: 10 },
  card: { flex: 1, minWidth: 0, marginBottom: 16 },
  media: { position: 'relative', width: '100%', aspectRatio: 0.76, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  image: { width: '100%', height: '100%' },
  heart: { position: 'absolute', right: 8, top: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(5,5,8,.7)', alignItems: 'center', justifyContent: 'center' },
  heartText: { color: '#fff', fontSize: 19 },
  heartActive: { color: colors.orange },
  cardTitle: { color: colors.text, fontWeight: '750', fontSize: 12, marginTop: 7 },
  cardMeta: { color: colors.dim, fontSize: 9, marginTop: 3 },
});
