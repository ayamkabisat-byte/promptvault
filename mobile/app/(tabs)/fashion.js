import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { BentoFeed, FloatingSearch } from '../../components/VisualFeed';

export default function FashionScreen() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => `${item.title || ''} ${item.region || ''} ${item.country || ''} ${item.scene || ''} ${item.era || ''}`.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.lavender} /></View>
      ) : (
        <BentoFeed
          items={filtered}
          getImage={(item) => item.image_img2img_url || item.image_infographic_url}
          onOpen={(item) => router.push(`/fashion/${item.id}`)}
        />
      )}
      <FloatingSearch value={search} onChangeText={setSearch} placeholder="Search Decora, Gyaru, Techwear…" accent={colors.lavender2} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
