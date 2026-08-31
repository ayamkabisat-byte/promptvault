import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { BentoFeed, FloatingSearch } from '../../components/VisualFeed';

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function DiscoverScreen() {
  const router = useRouter();
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
    if (!error) setRows(shuffle(data || []));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => `${item.title || ''} ${item.category || ''} ${item.medium || ''} ${item.model || ''} ${(item.tags || []).join(' ')}`.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.orange} /></View>
      ) : (
        <BentoFeed
          items={filtered}
          getImage={(item) => item.image_url}
          onOpen={(item) => router.push(`/prompt/${item.id}`)}
        />
      )}
      <FloatingSearch value={search} onChangeText={setSearch} placeholder="Search prompts, styles, tags…" accent={colors.orange} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
