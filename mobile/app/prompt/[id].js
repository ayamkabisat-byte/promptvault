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
  if (base.category && candidate.category === base.category) score += 5;
  if (base.medium && candidate.medium === base.medium) score += 3;
  if (base.model && candidate.model === base.model) score += 1;
  const tags = new Set(base.tags || []);
  for (const tag of candidate.tags || []) if (tags.has(tag)) score += 1;
  return score;
}

export default function PromptDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { toggle, has } = useFavorites();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setItem(null);
    setRelated([]);

    const load = async () => {
      const { data } = await supabase.from('prompts').select('*').eq('id', id).single();
      if (!active || !data) return;
      setItem(data);

      const { data: candidates } = await supabase
        .from('prompts')
        .select('id,title,image_url,model,medium,category,tags,status')
        .neq('id', id)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(48);

      if (!active) return;
      const ranked = [...(candidates || [])]
        .sort((a, b) => scoreRelated(data, b) - scoreRelated(data, a))
        .slice(0, 10);
      setRelated(ranked);
    };

    load();
    return () => { active = false; };
  }, [id]);

  const favorite = useMemo(() => item ? has(item.id, 'prompt') : false, [item, has]);

  if (!item) return <View style={styles.loading}><ActivityIndicator color={colors.orange} /></View>;

  const copy = async () => {
    await Clipboard.setStringAsync(item.description || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="contain" /> : null}
          <Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>‹</Text></Pressable>
        </View>

        <Text style={styles.kicker}>{item.medium || 'Prompt'} · {item.category || item.model || 'AI'}</Text>
        <Text style={styles.title}>{item.title}</Text>

        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={copy}><Text style={styles.primaryText}>{copied ? 'Copied ✓' : 'Copy Prompt'}</Text></Pressable>
          <Pressable style={styles.secondary} onPress={() => toggle(item, 'prompt')}><Text style={[styles.secondaryText, favorite && { color: colors.orange }]}>{favorite ? '♥ Saved' : '♡ Save'}</Text></Pressable>
        </View>

        <View style={styles.promptBox}><Text selectable style={styles.prompt}>{item.description}</Text></View>
        {!!item.tags?.length && <View style={styles.tags}>{item.tags.map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View>}

        {!!related.length && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>More like this</Text>
            <RelatedMasonry
              items={related}
              getImage={(row) => row.image_url}
              onOpen={(row) => router.push(`/prompt/${row.id}`)}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 44 },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  hero: { position: 'relative', width: '100%', height: 520, borderRadius: 22, overflow: 'hidden', backgroundColor: '#050507' },
  image: { width: '100%', height: '100%' },
  back: { position: 'absolute', left: 12, top: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(248,247,244,.94)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#17181d', fontSize: 38, lineHeight: 39, marginTop: -3 },
  kicker: { color: colors.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 18 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 16 },
  primary: { flex: 1, height: 46, borderRadius: 23, backgroundColor: '#f6f3ee', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#17181d', fontWeight: '900' },
  secondary: { paddingHorizontal: 18, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.text, fontWeight: '800' },
  promptBox: { marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: '#0d0d12', padding: 15 },
  prompt: { color: '#d0ccd5', fontSize: 13, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { color: colors.muted, fontSize: 10 },
  relatedSection: { marginTop: 28 },
  relatedTitle: { color: colors.text, fontSize: 21, fontWeight: '900', letterSpacing: -.5, marginBottom: 12 },
});
