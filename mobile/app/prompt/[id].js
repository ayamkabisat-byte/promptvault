import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { useFavorites } from '../../context/FavoritesContext';

export default function PromptDetailScreen() {
  const { id } = useLocalSearchParams();
  const { toggle, has } = useFavorites();
  const [item, setItem] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.from('prompts').select('*').eq('id', id).single().then(({ data }) => setItem(data || null));
  }, [id]);

  if (!item) return <View style={styles.loading}><ActivityIndicator color={colors.orange} /></View>;
  const favorite = has(item.id, 'prompt');

  const copy = async () => {
    await Clipboard.setStringAsync(item.description || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="contain" /> : null}
      <Text style={styles.kicker}>{item.medium || 'Prompt'} · {item.category || item.model || 'AI'}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={copy}><Text style={styles.primaryText}>{copied ? 'Copied ✓' : 'Copy Prompt'}</Text></Pressable>
        <Pressable style={styles.secondary} onPress={() => toggle(item, 'prompt')}><Text style={[styles.secondaryText, favorite && { color: colors.orange }]}>{favorite ? '♥ Saved' : '♡ Save'}</Text></Pressable>
      </View>
      <View style={styles.promptBox}><Text selectable style={styles.prompt}>{item.description}</Text></View>
      {!!item.tags?.length && <View style={styles.tags}>{item.tags.map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, paddingBottom: 40 },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: 430, backgroundColor: '#050507', borderRadius: 18 },
  kicker: { color: colors.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 18 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 16 },
  primary: { flex: 1, height: 44, borderRadius: 13, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#17100a', fontWeight: '900' },
  secondary: { paddingHorizontal: 16, height: 44, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.text, fontWeight: '800' },
  promptBox: { marginTop: 14, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: '#0d0d12', padding: 15 },
  prompt: { color: '#d0ccd5', fontSize: 13, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { color: colors.muted, fontSize: 10 },
});
