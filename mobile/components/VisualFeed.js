import { useMemo, useRef, useState, useWindowDimensions } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavBar } from '../context/NavBarContext';

const GAP = 8;
const CHUNK_SIZE = 6;
const HEIGHT_FACTORS = [1.58, 0.82, 1.08, 1.34, 0.72, 1.48, 0.94, 1.18, 0.78, 1.66, 1.02, 1.26];

function chunk(items, size = CHUNK_SIZE) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function hashKey(value) {
  const text = String(value ?? 'item');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function buildMasonryChunk(group, colWidth, keyFor) {
  const left = [];
  const right = [];
  let leftHeight = 0;
  let rightHeight = 0;

  group.forEach((item, index) => {
    const key = keyFor ? keyFor(item) : item.id;
    const factor = HEIGHT_FACTORS[(hashKey(key) + index) % HEIGHT_FACTORS.length];
    const height = Math.max(118, Math.round(colWidth * factor));
    const entry = { item, height, key: String(key) };

    if (leftHeight <= rightHeight) {
      left.push(entry);
      leftHeight += height + GAP;
    } else {
      right.push(entry);
      rightHeight += height + GAP;
    }
  });

  return { left, right };
}

function Tile({ item, image, height, onPress }) {
  return (
    <Pressable style={[styles.tile, { height }]} onPress={() => onPress(item)}>
      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.image}
          resizeMode="cover"
          resizeMethod="resize"
          fadeDuration={120}
        />
      ) : (
        <View style={styles.placeholder}><Text style={styles.placeholderText}>✦</Text></View>
      )}
    </Pressable>
  );
}

export function BentoFeed({ items, getImage, onOpen, keyFor }) {
  const { width } = useWindowDimensions();
  const { setCompact } = useNavBar();
  const contentWidth = Math.max(280, width - 24);
  const colWidth = (contentWidth - GAP) / 2;
  const anchorY = useRef(0);
  const lastCompact = useRef(false);

  const groups = useMemo(
    () => chunk(items).map((group) => buildMasonryChunk(group, colWidth, keyFor)),
    [items, colWidth, keyFor],
  );

  const updateCompact = (next) => {
    if (lastCompact.current === next) return;
    lastCompact.current = next;
    setCompact(next);
  };

  const handleScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y < 20) {
      anchorY.current = y;
      updateCompact(false);
      return;
    }

    const delta = y - anchorY.current;
    if (Math.abs(delta) < 14) return;
    updateCompact(delta > 0);
    anchorY.current = y;
  };

  const renderColumn = (entries) => (
    <View style={styles.masonryColumn}>
      {entries.map(({ item, height, key }) => (
        <Tile key={key} item={item} image={getImage(item)} height={height} onPress={onOpen} />
      ))}
    </View>
  );

  return (
    <FlatList
      data={groups}
      keyExtractor={(_, index) => `masonry-${index}`}
      contentContainerStyle={styles.feed}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={32}
      renderItem={({ item: group }) => (
        <View style={styles.masonryChunk}>
          {renderColumn(group.left)}
          {renderColumn(group.right)}
        </View>
      )}
      removeClippedSubviews
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      updateCellsBatchingPeriod={80}
      windowSize={4}
    />
  );
}

export function FloatingSearch({ value, onChangeText, placeholder = 'Search…', accent = '#ff9138' }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const top = insets.top + 12;

  if (!open) {
    return (
      <Pressable style={[styles.searchFab, { top }]} onPress={() => setOpen(true)} hitSlop={10}>
        <Text style={styles.searchIcon}>⌕</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.searchPanel, { top }]}>
      <TextInput
        autoFocus
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#777984"
        style={styles.searchInput}
        selectionColor={accent}
        returnKeyType="search"
      />
      <Pressable style={styles.searchClose} onPress={() => setOpen(false)} hitSlop={8}>
        <Text style={styles.searchCloseText}>×</Text>
      </Pressable>
    </View>
  );
}

export function RelatedMasonry({ items, getImage, onOpen, keyFor }) {
  const columns = [[], []];
  items.forEach((item, index) => columns[index % 2].push({ item, index }));
  const ratios = [0.72, 0.96, 0.8, 1.12, 0.68, 0.88];

  return (
    <View style={styles.relatedRow}>
      {columns.map((column, columnIndex) => (
        <View key={columnIndex} style={styles.relatedColumn}>
          {column.map(({ item, index }) => (
            <Pressable
              key={keyFor ? keyFor(item) : String(item.id)}
              style={[styles.relatedTile, { aspectRatio: ratios[index % ratios.length] }]}
              onPress={() => onOpen(item)}
            >
              {getImage(item) ? (
                <Image
                  source={{ uri: getImage(item) }}
                  style={styles.image}
                  resizeMode="cover"
                  resizeMethod="resize"
                  fadeDuration={120}
                />
              ) : null}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { paddingHorizontal: 12, paddingTop: 72, paddingBottom: 118 },
  masonryChunk: { flexDirection: 'row', gap: GAP, alignItems: 'flex-start', marginBottom: GAP },
  masonryColumn: { flex: 1, gap: GAP },
  tile: { width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: '#15151a' },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16161b' },
  placeholderText: { color: '#555761', fontSize: 24 },
  searchFab: {
    position: 'absolute', right: 16, zIndex: 60,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(248,247,244,.98)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: .22, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 14,
  },
  searchIcon: { color: '#17181d', fontSize: 28, lineHeight: 30, transform: [{ rotate: '-12deg' }] },
  searchPanel: {
    position: 'absolute', left: 14, right: 14, zIndex: 60,
    height: 50, borderRadius: 25, paddingLeft: 18, paddingRight: 6,
    backgroundColor: 'rgba(248,247,244,.99)', flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: .2, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 14,
  },
  searchInput: { flex: 1, color: '#17181d', fontSize: 14, height: 48 },
  searchClose: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8e6e1' },
  searchCloseText: { color: '#282a30', fontSize: 24, lineHeight: 26 },
  relatedRow: { flexDirection: 'row', gap: GAP, alignItems: 'flex-start' },
  relatedColumn: { flex: 1, gap: GAP },
  relatedTile: { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#15151a' },
});
