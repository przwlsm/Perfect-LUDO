import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ALL_PLAYER_COLORS, type DieValue, type PlayerColor } from '@/domain';
import { AnimatedDice } from '../components/AnimatedDice';
import { radialGrid, radialPoint, radialShift, radialYard } from '../board/radialLayout';
import { projectRadial } from '../board/radialCamera';
import { useUi } from '../theme/AppearanceProvider';
import { liftByDay } from '../theme/surfaces';

/** Height of the 3D table's centre hub, where the shared dice sits. */
const HUB_TOP = 0.25;
/** Space kept between a name pill and the edge of the board. */
const RIM_GAP = 2;
/** How far a yard's coins reach from its centre, in cells. */
const YARD_REACH = 1.5;

/** Keeps turned text the right way up (never past a quarter turn). */
function upright(degrees: number) {
  return degrees > 90 ? degrees - 180 : degrees < -90 ? degrees + 180 : degrees;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * The 5-6 player table's controls, laid over the round board itself: one
 * shared dice in the centre (the player whose turn it is rolls it) and each
 * player's name on the rim beside their own home, turned to face them when
 * everyone sits around one device.
 */
export function RoundBoardOverlay({
  size,
  colors,
  palette,
  nameOf,
  current,
  canRoll,
  rolling,
  value,
  diceFinish,
  surface,
  faceSeats,
  tilted,
  motionEnabled,
  onRoll,
}: {
  size: number;
  colors: readonly PlayerColor[];
  palette: Record<PlayerColor, string>;
  nameOf(color: PlayerColor): string;
  current: PlayerColor | null;
  canRoll: boolean;
  rolling: boolean;
  value: DieValue | null;
  diceFinish: string;
  surface: string;
  /** Pass & play: turn each name to face the person sitting at that home. */
  faceSeats: boolean;
  /** The 3D board is drawn tilted; names are mapped onto its rim instead of the flat one. */
  tilted: boolean;
  motionEnabled: boolean;
  onRoll(): void;
}) {
  const { t } = useTranslation('game');
  const ui = useUi();
  const day = ui.scheme === 'light';
  const cell = size / radialGrid(colors.length);
  const tile = Math.max(48, Math.round(size * 0.12));
  const pulse = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(pulse);
    pulse.value = 0;
    if (canRoll && motionEnabled)
      pulse.value = withRepeat(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    return () => cancelAnimation(pulse);
  }, [canRoll, motionEnabled, pulse]);

  const ring = useAnimatedStyle(() => ({
    opacity: canRoll ? 0.35 + pulse.value * 0.65 : 0,
    transform: [{ scale: 1 + pulse.value * 0.12 }],
  }));

  const accent = current ? palette[current] : '#ffffff';

  /**
   * Flat board point to screen point. On the 3D board, the point is found
   * through the very camera the board is drawn with (radialCamera), so names
   * and the dice sit exactly where they belong on the tilted table.
   */
  function place(x: number, y: number, height = 0) {
    if (!tilted) return { x, y, scale: 1 };
    const centre = (radialGrid(colors.length) - 1) / 2;
    return projectRadial(colors.length, size, [
      x / cell - 0.5 - centre,
      height,
      y / cell - 0.5 - centre,
    ]);
  }

  // The dice sits on the raised hub at the table's centre.
  const middle = place(size / 2, size / 2, HUB_TOP).y;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', width: size, height: size }}>
      {colors.map((color) => {
        const seat = ALL_PLAYER_COLORS.indexOf(color);
        // Just outside the home circle, on the rim, along the home's own direction.
        const [row, col] = radialPoint(
          seat + 0.5,
          colors.length,
          8.55 + radialShift(colors.length),
        );
        const at = place((col + 0.5) * cell, (row + 0.5) * cell);
        const angle = -90 + ((seat + 0.5) * 360) / colors.length;
        const active = color === current;
        const name = nameOf(color);
        const height = cell * 1.05 * at.scale;
        const fontSize = Math.max(9, cell * 0.55 * at.scale);
        // Sized to the name (roughly), so short names leave the rim clear.
        const width = Math.min(
          cell * 4.4 * at.scale,
          Math.max(cell * 2.4 * at.scale, name.length * fontSize * 0.6 + height),
        );
        const fit = (turn: number) => {
          // The pill as turned, kept wholly inside the board.
          const rad = (turn * Math.PI) / 180;
          const halfX = (Math.abs(Math.cos(rad)) * width + Math.abs(Math.sin(rad)) * height) / 2;
          const halfY = (Math.abs(Math.sin(rad)) * width + Math.abs(Math.cos(rad)) * height) / 2;
          const x = clamp(at.x, halfX + RIM_GAP, size - halfX - RIM_GAP);
          const y = clamp(at.y, halfY + RIM_GAP, size - halfY - RIM_GAP);
          return { turn, x, y, halfX, halfY };
        };
        let pill = fit(faceSeats ? angle - 90 : 0);
        if (!faceSeats) {
          // A level pill on a side seat of a big table either runs off the
          // board or, pulled back in, covers the coins in the yard. Those
          // names follow the rim instead, in the free strip beyond the yard.
          const [yr, yc] = radialYard(color, colors.length);
          const yard = place((yc + 0.5) * cell, (yr + 0.5) * cell);
          const dx = Math.max(Math.abs(pill.x - yard.x) - pill.halfX, 0);
          const dy = Math.max(Math.abs(pill.y - yard.y) - pill.halfY, 0);
          const yardReach = YARD_REACH * cell * yard.scale;
          if (dx * dx + dy * dy < yardReach * yardReach) pill = fit(upright(angle - 90));
        }
        const { turn, x, y } = pill;
        return (
          <View
            key={color}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: x - width / 2,
              top: y - height / 2,
              width,
              height,
              borderRadius: height / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette[color],
              borderWidth: active ? 2 : 1,
              borderColor: active ? '#ffffff' : '#ffffff80',
              boxShadow: active ? `0 0 10px ${palette[color]}` : undefined,
              transform: [{ rotate: `${turn}deg` }],
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{
                color: '#ffffff',
                fontWeight: '900',
                fontSize,
                textShadowColor: '#00000080',
                textShadowRadius: 2,
                paddingHorizontal: 4,
              }}
            >
              {name}
            </Text>
          </View>
        );
      })}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: size / 2 - tile / 2 - 6,
            top: middle - tile / 2 - 6,
            width: tile + 12,
            height: tile + 12,
            borderRadius: 18,
            borderWidth: 3,
            borderColor: accent,
          },
          ring,
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          current ? t('dice.rollA11y', { name: nameOf(current) }) : t('dice.label')
        }
        accessibilityHint={canRoll ? t('dice.yourTurnHint') : t('dice.waitHint')}
        accessibilityState={{ disabled: !canRoll }}
        disabled={!canRoll}
        onPress={onRoll}
        style={{
          position: 'absolute',
          left: size / 2 - tile / 2,
          top: middle - tile / 2,
          width: tile,
          height: tile,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: surface,
          borderWidth: 2.5,
          // By day the tile is white: with nobody to move (the game is over) a
          // white rim would leave a hole in the board, so it takes a navy
          // hairline and a soft lift instead; night is unchanged.
          borderColor: day && !current ? ui.border : accent,
          boxShadow: day
            ? [current ? `0 0 14px ${accent}99` : null, liftByDay(ui)].filter(Boolean).join(', ')
            : `0 0 14px ${accent}99`,
        }}
      >
        <AnimatedDice
          size={tile - 8}
          value={value}
          finish={diceFinish}
          rolling={rolling}
          ready={canRoll}
          motionEnabled={motionEnabled}
        />
      </Pressable>
    </View>
  );
}
