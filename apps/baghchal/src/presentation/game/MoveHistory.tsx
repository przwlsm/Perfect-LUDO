import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Turn } from '@/application/board/localGame';
import { describeMove } from '@/application/board/notation';
import { colors } from '../theme/colors';

/** The moves so far as a strip of chips, newest at the right and kept in view. */
export function MoveHistory({ turns }: { readonly turns: readonly Turn[] }) {
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [turns.length]);

  if (turns.length === 0) {
    return (
      <View style={[styles.strip, styles.centre]}>
        <Text style={styles.empty}>Moves appear here</Text>
      </View>
    );
  }
  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.content}
      accessibilityLabel="Move list"
    >
      {turns.map((turn) => {
        const tiger = turn.side === 'tiger';
        return (
          <View
            key={turn.ply}
            style={[styles.chip, { borderLeftColor: tiger ? colors.tiger : colors.goat }]}
            accessibilityLabel={`${turn.ply}, ${tiger ? 'tiger' : 'goat'}, ${describeMove(turn.move)}`}
          >
            <Text style={styles.ply}>{turn.ply}</Text>
            <Text style={styles.move}>{describeMove(turn.move)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { height: 44, marginTop: 16, flexGrow: 0 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { gap: 8, paddingHorizontal: 4, alignItems: 'center' },
  empty: { color: colors.muted, fontSize: 13 },
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  ply: { color: colors.muted, fontSize: 11 },
  move: { color: colors.text, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
