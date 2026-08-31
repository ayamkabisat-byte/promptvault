import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image as ExpoImage } from 'expo-image';
import { useNavBar } from '../context/NavBarContext';

const GAP = 8;
const FALLBACK_ASPECTS = [0.66, 0.82, 1.02, 0.72, 1.16, 0.78, 0.92, 0.69, 1.08];
const RELATED_ASPECTS = [0.72, 0.96, 0.8, 1.12, 0.68, 0.88];

function hashKey(value) {
  const text = String(value ?? 'item');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isWideIndex(index) {
  return index > 6 && index % 13 === 9;
}

function MasonryTile({ item, image, itemKey, index, onPress, wide }) {
  const fallback = wide ? 1.68 : FALLBACK_ASPECTS[(hashKey(itemKey) + index) % FALLBACK_ASPECTS.length];
  const [aspectRatio, setAspectRatio] = useState(fallback);

  useEffect(() => {
    setAspectRatio(fallback);
  }, [itemKey, fallback]);

  const onLoad = (event) => {
    if (wide) return;
    const width = event?.source?.width;
    const height = event?.source?.height;
    if (!width || !height) return;
    const next = clamp(width / height, 0.62, 1.22);
    if (Math.abs(next - aspectRatio) > 0.035) setAspectRatio(next);
  };

  return (
    <View style={styles.cellGutter}>
      <Pressable style={[styles.tile, { aspectRatio }]} onPress={() => onPress(item)}>
        {image ? (
          <ExpoImage
            source={image}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={String(itemKey)}
            transition={120}
            onLoad={onLoad}
          />
        ) : (
          <View style={styles.placeholder}><Text style={styles.placeholderText}>✦</Text></View>
        )}
      </Pressable>
    </View>
  );
}

export function BentoFeed({ items, getImage, onOpen, keyFor }) {
  const { setCompact } = useNavBar();
  const anchorY = useRef(0);
  const compactRef = useRef(false);

  const updateCompact = (next) => {
    if (compactRef.current === next) return;
    compactRef.current = next;
    setCompact(next);
  };

  const handleScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y < 36) {
      anchorY.current = y;
      updateCompact(false);
      return;
    }

    const delta = y - anchorY.current;
    if (Math.abs(delta) < 22) return;
    updateCompact(delta > 0);
    anchorY.current = y;
  };

  return (
    <FlashList
      data={items}
      masonry
      numColumns={2}
      optimizeItemArrangement
      keyExtractor={(item) => String(keyFor ? keyFor(item) : item.id)}
      getItemType={(_, index) => (isWideIndex(index) ? 'wide' : 'tile')}
      overrideItemLayout={(layout, _item, index) => {
        layout.span = isWideIndex(index) ? 2 : 1;
      }}
      renderItem={({ item, index }) => {
        const itemKey = keyFor ? keyFor(item) : item.id;
        return (
          <MasonryTile
            item={item}
            image={getImage(item)}
            itemKey={itemKey}
            index={index}
            onPress={onOpen}
            wide={isWideIndex(index)}
          />
        );
      }}
      contentContainerStyle={styles.feed}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={32}
      drawDistance={520}
    />
  );
}

export function FloatingSearch({ value, onChangeText, placeholder = 'Search…', accent = '#ff9138' }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Pressable style={styles.searchFab} onPress={() => setOpen(true)} hitSlop={14}>
        <Text style={styles.searchIcon}>⌕</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.searchPanel}>
      <TextInput
        autoFocus
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(37,39,45,.58)"
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

function RelatedTile({ item, image, index, onOpen, itemKey }) {
  return (
    <Pressable
      style={[styles.relatedTile, { aspectRatio: RELATED_ASPECTS[index % RELATED_ASPECTS.length] }]}
      onPress={() => onOpen(item)}
    >
      {image ? (
        <ExpoImage
          source={image}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={`related-${itemKey}`}
          transition={100}
        />
      ) : null}
    </Pressable>
  );
}

export function RelatedMasonry({ items, getImage, onOpen, keyFor }) {
  const columns = [[], []];
  items.forEach((item, index) => columns[index % 2].push({ item, index }));

  return (
    <View style={styles.relatedRow}>
      {columns.map((column, columnIndex) => (
        <View key={columnIndex} style={styles.relatedColumn}>
          {column.map(({ item, index }) => {
            const itemKey = keyFor ? keyFor(item) : String(item.id);
            return (
              <RelatedTile
                key={itemKey}
                item={item}
                image={getImage(item)}
                index={index}
                itemKey={itemKey}
                onOpen={onOpen}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { paddingHorizontal: 8, paddingTop: 24, paddingBottom: 118 },
  cellGutter: { paddingHorizontal: GAP / 2, paddingBottom: GAP },
  tile: { width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: '#15151a' },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16161b' },
  placeholderText: { color: '#555761', fontSize: 24 },
  searchFab: {
    position: 'absolute', right: 16, top: 38, zIndex: 80,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(248,247,244,.72)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,.26)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: .14, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  searchIcon: { color: '#17181d', fontSize: 28, lineHeight: 30, transform: [{ rotate: '-12deg' }, { translateY: -1 }] },
  searchPanel: {
    position: 'absolute', left: 14, right: 14, top: 38, zIndex: 80,
    height: 50, borderRadius: 25, paddingLeft: 18, paddingRight: 6,
    backgroundColor: 'rgba(248,247,244,.78)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,.28)',
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: .14, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  searchInput: { flex: 1, color: '#17181d', fontSize: 14, height: 48 },
  searchClose: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(224,222,218,.72)' },
  searchCloseText: { color: '#282a30', fontSize: 24, lineHeight: 26 },
  relatedRow: { flexDirection: 'row', gap: GAP, alignItems: 'flex-start' },
  relatedColumn: { flex: 1, gap: GAP },
  relatedTile: { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#15151a' },
});
