import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { useFavorites } from '../../context/FavoritesContext';

export default function FashionScreen() {
  const router = useRouter();
  const { toggle, has } = useFavorites();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fashion_prompts')
      .select('id,source_style_id,title,region,country,era,scene,image_img2img_url,image_infographic_url,prompt_img2img,status')
      .eq('status', 'published')
      .order('source_style_id', { ascending: true });
    if (!error) setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyPrompt = useCallback(async (item) => {
    if (!item?.prompt_img2img) return;
    await Clipboard.setStringAsync(item.prompt_img2img);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((current) => current === item.id ? null : current), 1300);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => `${item.title || ''} ${item.region || ''} ${item.country || ''} ${item.scene || ''} ${item.era || ''}`.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <View><Text style={styles.brand}>Fashion <Text style={styles.accent}>Prompt</Text></Text><Text style={styles.subtitle}>OOTD · infographic · transform prompt</Text></View>
        <Text style={styles.count}>{filtered.length}</Text>
      </View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search Decora, Gyaru, Techwear…" placeholderTextColor={colors.dim} style={styles.search} />
      {loading ? <ActivityIndicator color={colors.lavender} style={{ marginTop: 60 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const cover = item.image_img2img_url || item.image_infographic_url;
            const favorite = has(item.id, 'fashion');
            const copied = copiedId === item.id;
            return (
              <Pressable style={styles.card} onPress={() => router.push(`/fashion/${item.id}`)}>
                <View style={styles.media}>
                  {cover ? <Image source={{ uri: cover }} style={styles.image} resizeMode="cover" /> : <View style={styles.placeholder}><Text style={styles.placeholderText}>Image pending</Text></View>}
                  <View style={styles.badge}><Text style={styles.badgeText}>LOOK</Text></View>
                  <Pressable style={styles.heart} onPress={(e) => { e.stopPropagation?.(); toggle(item, 'fashion'); }}>
                    <Text style={[styles.heartText, favorite && styles.heartActive]}>{favorite ? '♥' : '♡'}</Text>
                  </Pressable>
                  {!!item.prompt_img2img && (
                    <Pressable style={[styles.copyButton, copied && styles.copyButtonActive]} onPress={(e) => { e.stopPropagation?.(); copyPrompt(item); }}>
                      <Text style={[styles.copyText, copied && styles.copyTextActive]}>{copied ? '✓ COPIED' : '⧉ COPY'}</Text>
                    </Pressable>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.cardMeta}>{item.region} · {item.era}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  brand: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -1.2 },
  accent: { color: colors.lavender2 },
  subtitle: { color: colors.muted, marginTop: 2, fontSize: 11 },
  count: { color: colors.dim, fontWeight: '800' },
  search: { height: 44, marginHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: '#0d0d12', color: colors.text, borderRadius: 14, paddingHorizontal: 14 },
  list: { paddingHorizontal: 10, paddingBottom: 24 },
  row: { gap: 10 },
  card: { flex: 1, minWidth: 0, marginBottom: 16 },
  media: { position: 'relative', width: '100%', aspectRatio: 0.75, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.dim, fontSize: 10 },
  badge: { position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(216,202,255,.92)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { color: '#17111f', fontWeight: '900', fontSize: 8, letterSpacing: 1 },
  heart: { position: 'absolute', right: 8, top: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(5,5,8,.72)', alignItems: 'center', justifyContent: 'center' },
  heartText: { color: '#fff', fontSize: 19 },
  heartActive: { color: colors.lavender2 },
  copyButton: { position: 'absolute', right: 8, bottom: 8, minWidth: 64, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: 'rgba(5,5,8,.76)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' },
  copyButtonActive: { backgroundColor: 'rgba(216,202,255,.96)', borderColor: 'rgba(216,202,255,1)' },
  copyText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  copyTextActive: { color: '#17111f' },
  cardTitle: { color: colors.text, fontWeight: '750', fontSize: 12, marginTop: 7 },
  cardMeta: { color: colors.dim, fontSize: 9, marginTop: 3 },
});
