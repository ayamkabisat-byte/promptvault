import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useState } from 'react';

const GAP = 8;

function chunk(items, size = 3) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function Tile({ item, image, height, onPress }) {
  return (
    <Pressable style={[styles.tile, { height }]} onPress={() => onPress(item)}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}><Text style={styles.placeholderText}>✦</Text></View>
      )}
    </Pressable>
  );
}

export function BentoFeed({ items, getImage, onOpen, keyFor }) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(280, width - 24);
  const col = (contentWidth - GAP) / 2;
  const tall = Math.round(col * 1.55);
  const small = Math.round((tall - GAP) / 2);
  const wide = Math.round(contentWidth * 0.58);
  const bottom = Math.round(col * 0.82);
  const groups = chunk(items, 3);

  const renderTile = (item, height) => item ? (
    <Tile
      key={keyFor ? keyFor(item) : String(item.id)}
      item={item}
      image={getImage(item)}
      height={height}
      onPress={onOpen}
    />
  ) : <View style={{ height }} />;

  return (
    <FlatList
      data={groups}
      keyExtractor={(group, index) => `${keyFor ? keyFor(group[0]) : group[0]?.id || 'group'}-${index}`}
      contentContainerStyle={styles.feed}
      showsVerticalScrollIndicator={false}
      renderItem={({ item: group, index }) => {
        const pattern = index % 3;
        if (pattern === 0) {
          return (
            <View style={[styles.groupRow, { height: tall }]}>
              <View style={styles.column}>{renderTile(group[0], tall)}</View>
              <View style={styles.columnStack}>{renderTile(group[1], small)}{renderTile(group[2], small)}</View>
            </View>
          );
        }
        if (pattern === 1) {
          return (
            <View style={[styles.groupRow, { height: tall }]}>
              <View style={styles.columnStack}>{renderTile(group[0], small)}{renderTile(group[1], small)}</View>
              <View style={styles.column}>{renderTile(group[2] || group[1] || group[0], tall)}</View>
            </View>
          );
        }
        return (
          <View style={styles.groupBlock}>
            {renderTile(group[0], wide)}
            <View style={styles.groupRow}>{renderTile(group[1], bottom)}{renderTile(group[2], bottom)}</View>
          </View>
        );
      }}
      removeClippedSubviews
      initialNumToRender={5}
      windowSize={7}
    />
  );
}

export function FloatingSearch({ value, onChangeText, placeholder = 'Search…', accent = '#ff9138' }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Pressable style={styles.searchFab} onPress={() => setOpen(true)} hitSlop={12}>
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
        placeholderTextColor="#777984"
        style={styles.searchInput}
        selectionColor={accent}
        returnKeyType="search"
      />
      <Pressable style={styles.searchClose} onPress={() => setOpen(false)} hitSlop={8}><Text style={styles.searchCloseText}>×</Text></Pressable>
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
              {getImage(item) ? <Image source={{ uri: getImage(item) }} style={styles.image} resizeMode="cover" /> : null}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { paddingHorizontal: 12, paddingTop: 20, paddingBottom: 112 },
  groupRow: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  groupBlock: { gap: GAP, marginBottom: GAP },
  column: { flex: 1 },
  columnStack: { flex: 1, gap: GAP },
  tile: { flex: 1, width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: '#15151a' },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16161b' },
  placeholderText: { color: '#555761', fontSize: 24 },
  searchFab: {
    position: 'absolute', right: 14, top: 24, zIndex: 50,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(248,247,244,.98)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: .22, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 12,
  },
  searchIcon: { color: '#17181d', fontSize: 28, lineHeight: 30, transform: [{ rotate: '-12deg' }] },
  searchPanel: {
    position: 'absolute', left: 12, right: 12, top: 24, zIndex: 50,
    height: 48, borderRadius: 24, paddingLeft: 18, paddingRight: 6,
    backgroundColor: 'rgba(248,247,244,.98)', flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: .2, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 12,
  },
  searchInput: { flex: 1, color: '#17181d', fontSize: 14, height: 46 },
  searchClose: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8e6e1' },
  searchCloseText: { color: '#282a30', fontSize: 24, lineHeight: 26 },
  relatedRow: { flexDirection: 'row', gap: GAP, alignItems: 'flex-start' },
  relatedColumn: { flex: 1, gap: GAP },
  relatedTile: { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#15151a' },
});
