import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Move, Piece } from '@/domain';
import { PieceToken } from '../components/PieceToken';
import { getCellForPiece } from './getCellForPiece';
import { getPieceWaypoints, PIECE_JUMP_MS, PIECE_STEP_MS } from './pieceMotion';

interface Props {
  piece: Piece;
  playerCount?: number;
  yardSlot: number;
  stackIndex: number;
  stackCount?: number;
  cellSize: number;
  fill: string;
  pieceStyle?: 'coin' | 'pawn';
  /** See Board2DProps.flip. Must match the board it is drawn on, or the
   * piece renders at its un-flipped seat's cell instead of the flipped one. */
  flip?: boolean;
  move?: Move;
  motionEnabled: boolean;
  onSelectMove(move: Move): void;
}
export function AnimatedPiece2D({
  piece,
  playerCount = 4,
  yardSlot,
  stackIndex,
  stackCount = 1,
  cellSize,
  fill,
  pieceStyle,
  flip = false,
  move,
  motionEnabled,
  onSelectMove,
}: Props) {
  const [row, col] = getCellForPiece(piece, yardSlot, playerCount, flip);
  const columns = Math.ceil(Math.sqrt(stackCount));
  const offset =
    stackCount > 1 ? ((stackIndex % columns) - (columns - 1) / 2) * cellSize * 0.48 : 0;
  const offsetY =
    stackCount > 1
      ? (Math.floor(stackIndex / columns) - (Math.ceil(stackCount / columns) - 1) / 2) *
        cellSize *
        0.48
      : 0;
  const targetX = (col + 0.5) * cellSize + offset;
  const targetY = (row + 0.5) * cellSize + offsetY;
  const { t } = useTranslation('game');
  const x = useSharedValue(targetX);
  const y = useSharedValue(targetY);
  const hop = useSharedValue(0);
  const previous = useRef({ progress: piece.progress, cellSize });
  const { id, color, progress } = piece;
  useEffect(() => {
    const from = previous.current;
    previous.current = { progress, cellSize };
    cancelAnimation(x);
    cancelAnimation(y);
    cancelAnimation(hop);
    if (!motionEnabled || from.cellSize !== cellSize) {
      x.value = targetX;
      y.value = targetY;
      hop.value = 0;
      return;
    }
    const changed = from.progress !== progress;
    const path = getPieceWaypoints(
      { id, color, progress },
      from.progress,
      yardSlot,
      playerCount,
      flip,
    );
    const duration = changed ? (path.length === 1 ? PIECE_JUMP_MS : PIECE_STEP_MS) : 160;
    const config = {
      duration,
      easing: Easing.inOut(Easing.quad),
      reduceMotion: ReduceMotion.System,
    };
    const xs = path.map(([, c], i) =>
      withTiming((c + 0.5) * cellSize + (i === path.length - 1 ? offset : 0), config),
    );
    const ys = path.map(([r], i) =>
      withTiming((r + 0.5) * cellSize + (i === path.length - 1 ? offsetY : 0), config),
    );
    x.value = withSequence(ReduceMotion.System, xs[0]!, ...xs.slice(1));
    y.value = withSequence(ReduceMotion.System, ys[0]!, ...ys.slice(1));
    if (changed) {
      hop.value = withRepeat(
        withSequence(
          withTiming(-cellSize * 0.32, { duration: duration / 2 }),
          withTiming(0, { duration: duration / 2 }),
        ),
        path.length,
        false,
      );
    }
    return () => {
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(hop);
    };
  }, [
    playerCount,
    flip,
    id,
    color,
    progress,
    yardSlot,
    cellSize,
    offset,
    offsetY,
    targetX,
    targetY,
    motionEnabled,
    x,
    y,
    hop,
  ]);
  const position = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value + hop.value }],
  }));
  // The hit area moves with the piece. Legal pieces stay above inactive safe-square stacks.
  const hitSize = Math.max(cellSize * 1.35, Math.min(48, cellSize * 1.9));
  return (
    <Animated.View
      pointerEvents={move ? 'auto' : 'none'}
      style={[
        styles.slot,
        {
          width: hitSize,
          height: hitSize,
          marginLeft: -hitSize / 2,
          marginTop: -hitSize / 2,
          zIndex: move ? 100 + stackIndex : stackIndex + 1,
        },
        position,
      ]}
    >
      <PieceToken
        color={color}
        fill={fill}
        pieceStyle={pieceStyle}
        label={t('piece.numbered', {
          color: t(`colors.${color}`).toUpperCase(),
          number: yardSlot + 1,
        })}
        isTappable={Boolean(move)}
        motionEnabled={motionEnabled}
        size={cellSize * (stackCount > 1 ? 0.65 : progress === 0 ? 1.25 : 0.88)}
        hitSize={hitSize}
        onPress={move ? () => onSelectMove(move) : undefined}
      />
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
});
