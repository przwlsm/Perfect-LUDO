import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { starsOf } from '@/domain/entities/Progress';
import type { Script } from '@/domain/entities/Script';
import { lettersOf } from '@/domain/entities/Script';
import { useProgress } from '../state/ProgressProvider';
import { useTheme } from '../theme/ThemeProvider';
import { ScriptText } from './Bits';
import { Pressy } from './Kit';

const TILE = 50;
const GAP = 8;

/** The script's letters in a row: where you are, what you have written, a tap to jump. */
export function LetterStrip({
  script,
  index,
  onPick,
}: {
  script: Script;
  index: number;
  onPick: (index: number) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { progress } = useProgress();
  const scroll = useRef<ScrollView>(null);
  const letters = lettersOf(script);

  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, index * (TILE + GAP) - TILE * 2.5), animated: true });
  }, [index]);

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.strip}
    >
      {letters.map((l, i) => {
        const stars = starsOf(progress, script.id, l.char);
        const current = i === index;
        return (
          <Pressy
            key={l.char}
            onPress={() => onPick(i)}
            accessibilityLabel={t('script.letterA11y', {
              letter: l.char,
              translit: l.translit,
              count: stars,
            })}
            accessibilityState={{ selected: current }}
            depth={0.9}
            style={[
              styles.tile,
              {
                backgroundColor: current ? theme.accent : theme.surface,
                borderColor: current ? 'transparent' : theme.border,
              },
            ]}
          >
            <ScriptText
              script={script}
              size={22}
              color={current ? theme.onAccent : theme.text}
              style={styles.letter}
            >
              {l.char}
            </ScriptText>
            <View style={styles.dots}>
              {[0, 1, 2].map((k) => (
                <View
                  key={k}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        k < stars ? theme.star : current ? theme.onAccent : theme.starEmpty,
                    },
                    current && k >= stars && styles.dim,
                  ]}
                />
              ))}
            </View>
          </Pressy>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { flexGrow: 0, marginHorizontal: -16 },
  row: { gap: GAP, paddingHorizontal: 16, paddingVertical: 4 },
  tile: {
    width: TILE,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { textAlign: 'center', lineHeight: 34 },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dim: { opacity: 0.35 },
});
