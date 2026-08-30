import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { useFavorites } from '../../context/FavoritesContext';

export default function FashionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { toggle, has } = useFavorites();
  const [item, setItem] = useState(null);
  const [order, setOrder] = useState([]);
  const [mode, setMode] = useState('look');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.from('fashion_prompts').select('*').eq('id', id).single().then(({ data }) => {
      setItem(data || null);
      setMode(data?.image_img2img_url ? 'look' : 'info');
    });
    supabase.from('fashion_prompts').select('id,source_style_id').eq('status', 'published').order('source_style_id', { ascending: true }).then(({ data }) => setOrder(data || []));
  }, [id]);

  const index = useMemo(() => order.findIndex((row) => String(row.id) === String(id)), [order, id]);
  const go = (delta) => {
    if (!order.length || index < 0) return;
    const next = order[(index + delta + order.length) % order.length];
    router.replace(`/fashion/${next.id}`);
  };

  if (!item) return <View style={styles.loading}><ActivityIndicator color={colors.lavender} /></View>;

  const image = mode === 'look' ? (item.image_img2img_url || item.image_infographic_url) : (item.image_infographic_url || item.image_img2img_url);
  const favorite = has(item.id, 'fashion');
  const prompt = item.prompt_img2img || item.prompt_infographic || '';

  const copy = async () => {
    await Clipboard.setStringAsync(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.tabs}>
        <Pressable disabled={!item.image_img2img_url} style={[styles.tab, mode === 'look' && styles.tabActive]} onPress={() => setMode('look')}><Text style={[styles.tabText, mode === 'look' && styles.tabTextActive]}>LOOK</Text></Pressable>
        <Pressable disabled={!item.image_infographic_url} style={[styles.tab, mode === 'info' && styles.tabActive]} onPress={() => setMode('info')}><Text style={[styles.tabText, mode === 'info' && styles.tabTextActive]}>INFOGRAPHIC</Text></Pressable>
      </View>
      {image ? <Image source={{ uri: image }} style={styles.image} resizeMode="contain" /> : null}
      <View style={styles.pager}>
        <Pressable style={styles.pagerBtn} onPress={() => go(-1)}><Text style={styles.pagerText}>← Previous</Text></Pressable>
        <Text style={styles.counter}>{index >= 0 ? `${index + 1} / ${order.length}` : ''}</Text>
        <Pressable style={styles.pagerBtn} onPress={() => go(1)}><Text style={styles.pagerText}>Next →</Text></Pressable>
      </View>
      <Text style={styles.kicker}>{item.country || item.region} · {item.era}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.dna}>{item.visual_dna}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={copy}><Text style={styles.primaryText}>{copied ? 'Copied ✓' : 'Copy Transform Prompt'}</Text></Pressable>
        <Pressable style={styles.secondary} onPress={() => toggle(item, 'fashion')}><Text style={[styles.secondaryText, favorite && { color: colors.lavender2 }]}>{favorite ? '♥ Saved' : '♡ Save'}</Text></Pressable>
      </View>
      <View style={styles.metaGrid}>
        {[['Silhouette', item.silhouette], ['Wardrobe', item.wardrobe], ['Hair', item.hair], ['Makeup / Grooming', item.makeup], ['Accessories', item.accessories], ['Palette', item.palette]].map(([label, value]) => (
          <View key={label} style={styles.meta}><Text style={styles.metaLabel}>{label}</Text><Text style={styles.metaText}>{value || '—'}</Text></View>
        ))}
      </View>
      <View style={styles.promptBox}><Text selectable style={styles.prompt}>{prompt}</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, paddingBottom: 44 },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  tabs: { alignSelf: 'center', flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: 999, padding: 4, marginBottom: 10, backgroundColor: colors.panel },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  tabActive: { backgroundColor: colors.lavender },
  tabText: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  tabTextActive: { color: '#181020' },
  image: { width: '100%', height: 485, backgroundColor: '#050507', borderRadius: 18 },
  pager: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pagerBtn: { paddingVertical: 9, paddingHorizontal: 5 },
  pagerText: { color: colors.lavender2, fontWeight: '800', fontSize: 11 },
  counter: { color: colors.dim, fontSize: 10 },
  kicker: { color: colors.lavender, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 13 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  dna: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 16 },
  primary: { flex: 1, height: 44, borderRadius: 13, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#181020', fontWeight: '900', fontSize: 11 },
  secondary: { paddingHorizontal: 16, height: 44, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.text, fontWeight: '800' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  meta: { width: '48.5%', borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 11, backgroundColor: colors.panel },
  metaLabel: { color: colors.lavender, fontSize: 8, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase' },
  metaText: { color: '#c4becb', fontSize: 10, lineHeight: 15, marginTop: 5 },
  promptBox: { marginTop: 14, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: '#0d0d12', padding: 15 },
  prompt: { color: '#d0ccd5', fontSize: 12, lineHeight: 19 },
});
