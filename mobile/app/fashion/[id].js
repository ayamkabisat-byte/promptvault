import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { useFavorites } from '../../context/FavoritesContext';
import { RelatedMasonry } from '../../components/VisualFeed';

function scoreRelated(base, candidate) {
  let score = 0;
  if (base.region && candidate.region === base.region) score += 5;
  if (base.country && candidate.country === base.country) score += 4;
  if (base.scene && candidate.scene === base.scene) score += 3;
  if (base.era && candidate.era === base.era) score += 1;
  return score;
}

export default function FashionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { toggle, has } = useFavorites();
  const [item, setItem] = useState(null);
  const [order, setOrder] = useState([]);
  const [related, setRelated] = useState([]);
  const [mode, setMode] = useState('look');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setItem(null);
    setRelated([]);

    const load = async () => {
      const [{ data }, { data: allOrder }] = await Promise.all([
        supabase.from('fashion_prompts').select('*').eq('id', id).single(),
        supabase.from('fashion_prompts').select('id,source_style_id').eq('status', 'published').order('source_style_id', { ascending: true }),
      ]);

      if (!active || !data) return;
      setItem(data);
      setOrder(allOrder || []);
      setMode(data.image_img2img_url ? 'look' : 'info');

      const { data: candidates } = await supabase
        .from('fashion_prompts')
        .select('id,source_style_id,title,region,country,era,scene,image_img2img_url,image_infographic_url,status')
        .eq('status', 'published')
        .neq('id', id)
        .limit(80);

      if (!active) return;
      const ranked = [...(candidates || [])]
        .sort((a, b) => scoreRelated(data, b) - scoreRelated(data, a))
        .slice(0, 10);
      setRelated(ranked);
    };

    load();
    return () => { active = false; };
  }, [id]);

  const index = useMemo(() => order.findIndex((row) => String(row.id) === String(id)), [order, id]);
  const favorite = useMemo(() => item ? has(item.id, 'fashion') : false, [item, has]);

  const go = (delta) => {
    if (!order.length || index < 0) return;
    const next = order[(index + delta + order.length) % order.length];
    router.replace(`/fashion/${next.id}`);
  };

  if (!item) return <View style={styles.loading}><ActivityIndicator color={colors.lavender} /></View>;

  const image = mode === 'look' ? (item.image_img2img_url || item.image_infographic_url) : (item.image_infographic_url || item.image_img2img_url);
  const prompt = item.prompt_img2img || item.prompt_infographic || '';

  const copy = async () => {
    await Clipboard.setStringAsync(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {image ? <Image source={{ uri: image }} style={styles.image} resizeMode="contain" /> : null}
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={styles.modeSwitch}>
            <Pressable disabled={!item.image_img2img_url} style={[styles.modeButton, mode === 'look' && styles.modeActive]} onPress={() => setMode('look')}>
              <Text style={[styles.modeText, mode === 'look' && styles.modeTextActive]}>LOOK</Text>
            </Pressable>
            <Pressable disabled={!item.image_infographic_url} style={[styles.modeButton, mode === 'info' && styles.modeActive]} onPress={() => setMode('info')}>
              <Text style={[styles.modeText, mode === 'info' && styles.modeTextActive]}>INFO</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.pager}>
          <Pressable onPress={() => go(-1)}><Text style={styles.pagerText}>← Previous</Text></Pressable>
          <Text style={styles.counter}>{index >= 0 ? `${index + 1} / ${order.length}` : ''}</Text>
          <Pressable onPress={() => go(1)}><Text style={styles.pagerText}>Next →</Text></Pressable>
        </View>

        <Text style={styles.kicker}>{item.country || item.region} · {item.era}</Text>
        <Text style={styles.title}>{item.title}</Text>
        {!!item.visual_dna && <Text style={styles.dna}>{item.visual_dna}</Text>}

        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={copy}><Text style={styles.primaryText}>{copied ? 'Copied ✓' : 'Copy Transform Prompt'}</Text></Pressable>
          <Pressable style={styles.secondary} onPress={() => toggle(item, 'fashion')}><Text style={[styles.secondaryText, favorite && { color: colors.lavender2 }]}>{favorite ? '♥ Saved' : '♡ Save'}</Text></Pressable>
        </View>

        <View style={styles.metaGrid}>
          {[['Silhouette', item.silhouette], ['Wardrobe', item.wardrobe], ['Hair', item.hair], ['Makeup / Grooming', item.makeup], ['Accessories', item.accessories], ['Palette', item.palette]].map(([label, value]) => (
            <View key={label} style={styles.meta}>
              <Text style={styles.metaLabel}>{label}</Text>
              <Text style={styles.metaText}>{value || '—'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.promptBox}><Text selectable style={styles.prompt}>{prompt}</Text></View>

        {!!related.length && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>More like this</Text>
            <RelatedMasonry
              items={related}
              getImage={(row) => row.image_img2img_url || row.image_infographic_url}
              onOpen={(row) => router.push(`/fashion/${row.id}`)}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 48 },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  hero: { position: 'relative', width: '100%', height: 520, borderRadius: 22, overflow: 'hidden', backgroundColor: '#050507' },
  image: { width: '100%', height: '100%' },
  back: { position: 'absolute', left: 16, top: 18, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(248,247,244,.96)', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  backText: { color: '#17181d', fontSize: 25, lineHeight: 28, fontWeight: '700', marginLeft: -1 },
  modeSwitch: { position: 'absolute', right: 14, top: 18, flexDirection: 'row', gap: 3, backgroundColor: 'rgba(248,247,244,.95)', padding: 4, borderRadius: 22 },
  modeButton: { height: 34, paddingHorizontal: 12, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  modeActive: { backgroundColor: colors.lavender },
  modeText: { color: '#686b75', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  modeTextActive: { color: '#181020' },
  pager: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pagerText: { color: colors.lavender2, fontWeight: '800', fontSize: 11, paddingVertical: 8 },
  counter: { color: colors.dim, fontSize: 10 },
  kicker: { color: colors.lavender, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 10 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  dna: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 16 },
  primary: { flex: 1, height: 46, borderRadius: 23, backgroundColor: '#f6f3ee', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#17181d', fontWeight: '900', fontSize: 11 },
  secondary: { paddingHorizontal: 18, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.text, fontWeight: '800' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  meta: { width: '48.5%', borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 11, backgroundColor: colors.panel },
  metaLabel: { color: colors.lavender, fontSize: 8, fontWeight: '900', letterSpacing: .9, textTransform: 'uppercase' },
  metaText: { color: '#c4becb', fontSize: 10, lineHeight: 15, marginTop: 5 },
  promptBox: { marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: '#0d0d12', padding: 15 },
  prompt: { color: '#d0ccd5', fontSize: 12, lineHeight: 19 },
  relatedSection: { marginTop: 28 },
  relatedTitle: { color: colors.text, fontSize: 21, fontWeight: '900', letterSpacing: -.5, marginBottom: 12 },
});
