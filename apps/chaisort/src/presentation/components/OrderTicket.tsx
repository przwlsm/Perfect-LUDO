import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, createPicture, PaintStyle, Picture, Skia } from '@shopify/react-native-skia';
import { useTranslation } from 'react-i18next';
import { drawMark } from '../counter/paint';
import { INKS } from '../counter/inks';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './Kit';
import { Chaiwala } from './Chaiwala';

const CHIP = 26;
const GAP = 6;

/**
 * The chaiwala's order: one chip per ingredient on the counter, ticked as
 * its cup comes ready. The chips carry the ingredients' marks too.
 */
export function OrderTicket({
  ingredients,
  done,
  won,
  symbols,
}: {
  ingredients: readonly number[];
  done: ReadonlySet<number>;
  won: boolean;
  symbols: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const perRow = 7;
  const rows = Math.ceil(ingredients.length / perRow);
  const width = Math.min(ingredients.length, perRow) * (CHIP + GAP) - GAP + 4;
  const height = rows * (CHIP + GAP) - GAP + 4;
  const chips = useMemo(
    () =>
      createPicture((c) => {
        ingredients.forEach((ing, i) => {
          const ink = INKS[ing];
          if (!ink) return;
          const x = 2 + (i % perRow) * (CHIP + GAP) + CHIP / 2;
          const y = 2 + Math.floor(i / perRow) * (CHIP + GAP) + CHIP / 2;
          const served = done.has(ing);
          const p = Skia.Paint();
          p.setAntiAlias(true);
          p.setColor(Skia.Color(ink.colour));
          p.setAlphaf(served ? 1 : 0.9);
          c.drawCircle(x, y, CHIP / 2 - 1, p);
          const ring = Skia.Paint();
          ring.setAntiAlias(true);
          ring.setStyle(PaintStyle.Stroke);
          ring.setStrokeWidth(served ? 2.5 : 1);
          ring.setColor(Skia.Color(served ? theme.good : 'rgba(0,0,0,0.25)'));
          c.drawCircle(x, y, CHIP / 2 - 1, ring);
          if (symbols) drawMark(c, ink.mark, x, y, CHIP * 0.27, ink.markColour);
          if (served) {
            const badge = Skia.Paint();
            badge.setAntiAlias(true);
            badge.setColor(Skia.Color(theme.good));
            c.drawCircle(x + CHIP * 0.36, y - CHIP * 0.32, 6.5, badge);
            const tick = Skia.Paint();
            tick.setAntiAlias(true);
            tick.setStyle(PaintStyle.Stroke);
            tick.setStrokeWidth(1.8);
            tick.setColor(Skia.Color(theme.surface));
            c.drawPath(
              Skia.PathBuilder.Make()
                .moveTo(x + CHIP * 0.36 - 3, y - CHIP * 0.32)
                .lineTo(x + CHIP * 0.36 - 0.8, y - CHIP * 0.32 + 2.3)
                .lineTo(x + CHIP * 0.36 + 3.2, y - CHIP * 0.32 - 2.4)
                .build(),
              tick,
            );
          }
        });
      }),
    [ingredients, done, symbols, theme],
  );
  const count = ingredients.filter((i) => done.has(i)).length;
  return (
    <View
      style={[styles.ticket, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
      accessible
      accessibilityLabel={t('game.orderA11y', { done: count, total: ingredients.length })}
      accessibilityLiveRegion="polite"
    >
      <Chaiwala size={46} mood={won ? 'cheer' : count > 0 ? 'happy' : 'waiting'} />
      <View style={styles.middle}>
        <AppText variant="label" color={theme.accentText}>
          {t('game.order')}
        </AppText>
        <Canvas style={{ width, height }} pointerEvents="none">
          <Picture picture={chips} />
        </Canvas>
      </View>
      <AppText variant="heading" style={styles.count}>
        {count}/{ingredients.length}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 22,
    borderWidth: 1,
  },
  middle: { flex: 1, gap: 4 },
  count: { fontVariant: ['tabular-nums'] },
});
