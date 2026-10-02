import { memo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useUi } from '../theme/AppearanceProvider';

/**
 * The faint doodle wallpaper behind the app's screens: little Ludo boards,
 * dice, coins, crowns, stars and a few emojis, scattered like the pattern in
 * a chat app. Each doodle is drawn at a fixed spot (a seeded scatter, so it
 * never reshuffles), very faint so text on the page stays easy to read, and
 * mostly hidden behind cards; it shows in the gaps between them.
 *
 * Built from plain views, icons and emoji (no extra native module).
 */
export type DoodleDensity = 'full' | 'light';

const CELL_W = 104;
const CELL_H = 116;
const LUDO = ['#e94b4b', '#10b981', '#f5b301', '#3b82f6'] as const;
const ICONS = [
  'crown-outline',
  'star-four-points-outline',
  'trophy-outline',
  'chess-pawn',
  'heart-outline',
  'star-outline',
] as const;
const EMOJI = ['🎲', '👑', '⭐', '🏆', '🎉'] as const;

type Kind = 'board' | 'dice' | 'coin' | 'icon' | 'emoji';
const KINDS: readonly Kind[] = [
  'board',
  'icon',
  'dice',
  'coin',
  'icon',
  'emoji',
  'dice',
  'icon',
  'board',
  'coin',
];

/** A small, stable hash, so every cell keeps the same doodle on every render. */
function seed(i: number, j: number, salt: number) {
  let h = (i * 374761393 + j * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export const Doodles = memo(function Doodles({ density = 'full' }: { density?: DoodleDensity }) {
  const ui = useUi();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const onLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const { width, height } = nativeEvent.layout;
    if (Math.abs(width - area.width) > 1 || Math.abs(height - area.height) > 1)
      setArea({ width, height });
  };

  const day = ui.scheme === 'light';
  // Line art in the page's ink; colour pieces a little stronger, still faint.
  const ink = ui.text;
  const lineOpacity = day ? 0.08 : 0.07;
  const colourOpacity = day ? 0.16 : 0.2;
  const emojiOpacity = day ? 0.2 : 0.16;
  const keep = density === 'full' ? 0.62 : 0.3;

  const cols = Math.ceil(area.width / CELL_W) + 1;
  const rows = Math.ceil(area.height / CELL_H) + 1;
  const items = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      if (seed(i, j, 1) > keep) continue;
      // Every other row shifts half a cell, so the scatter never lines up in columns.
      const x = i * CELL_W + (j % 2) * (CELL_W / 2) + (seed(i, j, 2) - 0.5) * 34;
      const y = j * CELL_H + (seed(i, j, 3) - 0.5) * 34;
      const rotate = (seed(i, j, 4) - 0.5) * 50;
      const size = 22 + Math.round(seed(i, j, 5) * 12);
      const kind = KINDS[Math.floor(seed(i, j, 6) * KINDS.length)]!;
      const pick = Math.floor(seed(i, j, 7) * 100);
      items.push(
        <View
          key={`${i}-${j}`}
          style={{
            position: 'absolute',
            left: x - size / 2,
            top: y - size / 2,
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: `${rotate}deg` }],
          }}
        >
          {kind === 'board' && <MiniBoard size={size + 6} opacity={colourOpacity} />}
          {kind === 'dice' && (
            <Dice size={size} color={ink} opacity={lineOpacity} pips={pick % 2 ? 5 : 3} />
          )}
          {kind === 'coin' && (
            <Coin
              size={size * 0.85}
              color={LUDO[pick % LUDO.length]!}
              opacity={colourOpacity * 1.2}
            />
          )}
          {kind === 'icon' && (
            <MaterialCommunityIcons
              name={ICONS[pick % ICONS.length]!}
              size={size}
              color={ink}
              style={{ opacity: lineOpacity * 1.3 }}
            />
          )}
          {kind === 'emoji' && (
            <Text style={{ fontSize: size * 0.8, opacity: emojiOpacity }}>
              {EMOJI[pick % EMOJI.length]}
            </Text>
          )}
        </View>,
      );
    }

  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      {items}
    </View>
  );
});

/** A tiny Ludo board: four coloured yards, the cross between them left open. */
function MiniBoard({ size, opacity }: { size: number; opacity: number }) {
  const yard = size * 0.42;
  return (
    <View style={{ width: size, height: size, opacity }}>
      {LUDO.map((color, k) => (
        <View
          key={color}
          style={{
            position: 'absolute',
            left: k % 3 === 0 ? 0 : size - yard,
            top: k < 2 ? 0 : size - yard,
            width: yard,
            height: yard,
            borderRadius: yard * 0.28,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

const PIPS = {
  3: [
    [0.25, 0.25],
    [0.5, 0.5],
    [0.75, 0.75],
  ],
  5: [
    [0.25, 0.25],
    [0.25, 0.75],
    [0.5, 0.5],
    [0.75, 0.25],
    [0.75, 0.75],
  ],
} as const;

/** A die outline with its pips. */
function Dice({
  size,
  color,
  opacity,
  pips,
}: {
  size: number;
  color: string;
  opacity: number;
  pips: 3 | 5;
}) {
  const dot = size * 0.16;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        borderWidth: 2,
        borderColor: color,
        opacity,
      }}
    >
      {PIPS[pips].map(([top, left]) => (
        <View
          key={`${top}-${left}`}
          style={{
            position: 'absolute',
            top: top * (size - 4) - dot / 2,
            left: left * (size - 4) - dot / 2,
            width: dot,
            height: dot,
            borderRadius: dot,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

/** A Ludo coin seen from above: a ring with a filled centre. */
function Coin({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size,
        borderWidth: Math.max(2, size * 0.14),
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      <View
        style={{
          width: size * 0.36,
          height: size * 0.36,
          borderRadius: size,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
