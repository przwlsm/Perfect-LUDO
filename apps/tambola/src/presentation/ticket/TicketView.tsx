import { memo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isLight, withAlpha } from 'app-kit';
import type { Dabber, TicketTheme } from '@/domain/entities/Look';
import { COLUMNS, type TicketGrid } from '@/domain/entities/Ticket';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { Dab } from './Dab';

interface TicketViewProps {
  readonly grid: TicketGrid;
  /** "Ticket H7KQ-3" */
  readonly label: string;
  readonly look: TicketTheme;
  readonly dabber: Dabber;
  readonly daubed: ReadonlySet<number>;
  /** Tapping a number daubs it (or lifts the daub). Without it the ticket is read-only. */
  readonly onDaub?: (n: number) => void;
  /** Numbers that were probably called and not daubed (the optional helper). */
  readonly missed?: ReadonlySet<number>;
  /** Claim check: the numbers the prize needs, outlined. */
  readonly focus?: ReadonlySet<number>;
  /** Claim check: needed numbers that have not been called. */
  readonly missing?: ReadonlySet<number>;
  /** Something on the right of the header, such as the Claim button. */
  readonly right?: ReactNode;
}

const GAP = 3;
const PAD = 8;

/**
 * A ticket, drawn to be read at a glance across a noisy room: big rounded
 * numerals with at least 7:1 contrast, quiet blank cells, and daubs that
 * keep the number readable on top.
 */
export const TicketView = memo(function TicketView({
  grid,
  label,
  look,
  dabber,
  daubed,
  onDaub,
  missed,
  focus,
  missing,
  right,
}: TicketViewProps) {
  const { t } = useTranslation();
  const { calmMotion } = useSettings();
  const [width, setWidth] = useState(0);
  // Daubs that were already there when the ticket appeared don't stamp in again.
  const [initial] = useState<ReadonlySet<number>>(() => new Set(daubed));
  const cell = width > 0 ? (width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const cellH = cell * 1.08;
  const numberSize = Math.max(14, Math.min(30, cell * 0.54));
  const dark = !isLight(look.paper);

  return (
    <View
      style={[
        styles.ticket,
        {
          backgroundColor: look.paper,
          borderColor: look.rule,
          boxShadow:
            look.ornament === 'neon'
              ? `0 0 18px ${withAlpha(look.rule, 0.45)}`
              : `0 8px 20px rgba(20, 0, 30, ${dark ? 0.45 : 0.18})`,
        },
      ]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.header, { backgroundColor: look.header }]}>
        <Ornament look={look} />
        <Text
          style={[styles.label, { color: look.headerInk }]}
          maxFontSizeMultiplier={1.4}
          numberOfLines={1}
        >
          {label}
        </Text>
        {right}
      </View>
      {look.ornament === 'bunting' && <Bunting look={look} />}
      {look.ornament === 'lights' && <Bulbs look={look} />}
      <View
        style={[styles.grid, { padding: PAD, gap: GAP, minHeight: cellH * 3 + GAP * 2 + PAD * 2 }]}
      >
        {cell > 0 &&
          grid.map((row, r) => (
            <View key={r} style={[styles.row, { gap: GAP }]}>
              {row.map((n, c) =>
                n === null ? (
                  <View
                    key={c}
                    style={[
                      styles.cell,
                      { width: cell, height: cellH, backgroundColor: look.blank },
                    ]}
                  >
                    <View
                      style={[
                        styles.blankDot,
                        {
                          backgroundColor: withAlpha(
                            look.sparkle[(r + c) % look.sparkle.length]!,
                            0.28,
                          ),
                        },
                      ]}
                    />
                  </View>
                ) : (
                  <NumberCell
                    key={c}
                    n={n}
                    size={cell}
                    height={cellH}
                    fontSize={numberSize}
                    look={look}
                    dabber={dabber}
                    daubed={daubed.has(n)}
                    fresh={!calmMotion && !initial.has(n)}
                    missed={!!missed?.has(n)}
                    focus={!!focus?.has(n)}
                    missing={!!missing?.has(n)}
                    onDaub={onDaub}
                    a11y={
                      daubed.has(n)
                        ? t('ticket.cellDaubed', { n })
                        : missed?.has(n)
                          ? t('ticket.cellMissed', { n })
                          : t('ticket.cell', { n })
                    }
                  />
                ),
              )}
            </View>
          ))}
      </View>
    </View>
  );
});

interface NumberCellProps {
  readonly n: number;
  readonly size: number;
  readonly height: number;
  readonly fontSize: number;
  readonly look: TicketTheme;
  readonly dabber: Dabber;
  readonly daubed: boolean;
  readonly fresh: boolean;
  readonly missed: boolean;
  readonly focus: boolean;
  readonly missing: boolean;
  readonly onDaub?: (n: number) => void;
  readonly a11y: string;
}

function NumberCell({
  n,
  size,
  height,
  fontSize,
  look,
  dabber,
  daubed,
  fresh,
  missed,
  focus,
  missing,
  onDaub,
  a11y,
}: NumberCellProps) {
  const ink = daubed && dabber.shape !== 'ring' ? dabber.onColor : missing ? '#8a1c12' : look.ink;
  const outline = missing ? '#e53935' : focus ? look.header : missed ? '#ff9f1c' : 'transparent';
  const content = (
    <>
      {daubed && (
        <Dab
          dabber={dabber}
          size={Math.min(size, height)}
          animate={fresh}
          tilt={((n * 37) % 25) - 12}
        />
      )}
      <Text
        style={[styles.number, { color: ink, fontSize, lineHeight: fontSize * 1.2 }]}
        allowFontScaling={false}
      >
        {n}
      </Text>
      {missed && !daubed && (
        <View style={styles.missedBadge}>
          <Ionicons name="ellipse" size={8} color="#ff9f1c" />
        </View>
      )}
    </>
  );
  const style = [
    styles.cell,
    {
      width: size,
      height,
      backgroundColor: missing ? '#ffe3e0' : look.cell,
      borderColor: outline,
      borderWidth: outline === 'transparent' ? 0 : missing || focus ? 2.5 : 2,
      borderStyle: (missed && !focus && !missing ? 'dashed' : 'solid') as 'dashed' | 'solid',
    },
  ];
  if (!onDaub) {
    return (
      <View style={style} accessible accessibilityLabel={a11y}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => onDaub(n)}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: daubed }}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

/** The header's flourish: a small motif per theme. */
function Ornament({ look }: { look: TicketTheme }) {
  const icon =
    look.ornament === 'paisley'
      ? 'flower-outline'
      : look.ornament === 'feathers'
        ? 'leaf'
        : look.ornament === 'neon'
          ? 'flash'
          : look.ornament === 'lights'
            ? 'sparkles'
            : look.id === 'kitty'
              ? 'heart'
              : 'star';
  return <Ionicons name={icon} size={15} color={look.headerInk} style={styles.ornament} />;
}

/** Little paper flags under the header (Classic). */
function Bunting({ look }: { look: TicketTheme }) {
  return (
    <View style={[styles.bunting, styles.noTouch]}>
      {Array.from({ length: 16 }, (_, i) => (
        <View
          key={i}
          style={[styles.flag, { borderTopColor: look.sparkle[i % look.sparkle.length] }]}
        />
      ))}
    </View>
  );
}

/** A row of glowing bulbs under the header (Diwali Lights). */
function Bulbs({ look }: { look: TicketTheme }) {
  return (
    <View style={[styles.bulbs, styles.noTouch]}>
      {Array.from({ length: 14 }, (_, i) => {
        const c = look.sparkle[i % look.sparkle.length]!;
        return (
          <View key={i} style={[styles.bulb, { backgroundColor: c, boxShadow: `0 0 6px ${c}` }]} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
  ticket: { borderRadius: 18, borderWidth: 2, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 6,
    minHeight: 44,
  },
  label: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 16,
    letterSpacing: 0.6,
  },
  ornament: { opacity: 0.9 },
  bunting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    height: 7,
    overflow: 'hidden',
  },
  flag: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bulbs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 5,
  },
  bulb: { width: 6, height: 6, borderRadius: 3 },
  grid: { justifyContent: 'center' },
  row: { flexDirection: 'row' },
  cell: {
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  blankDot: { width: 5, height: 5, borderRadius: 2.5 },
  number: { fontFamily: FONTS.display, textAlign: 'center', includeFontPadding: false },
  missedBadge: { position: 'absolute', top: 2, right: 3 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.94 }] },
});
