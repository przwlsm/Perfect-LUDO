import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
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
import { getPieceWaypoints, PIECE_STEP_MS } from './pieceMotion';

interface Props {
  piece: Piece;
  yardSlot: number;
  stackIndex: number;
  cellSize: number;
  fill: string;
  move?: Move;
  motionEnabled: boolean;
  onSelectMove(move: Move): void;
}
export function AnimatedPiece2D({
  piece,
  yardSlot,
  stackIndex,
  cellSize,
  fill,
  move,
  motionEnabled,
  onSelectMove,
}: Props) {
  const [row, col] = getCellForPiece(piece, yardSlot);
  const offset = stackIndex * cellSize * 0.16;
  const targetX = (col + 0.5) * cellSize + offset;
  const targetY = (row + 0.5) * cellSize - offset;
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
    const path = getPieceWaypoints({ id, color, progress }, from.progress, yardSlot);
    const duration = changed ? (path.length === 1 ? 240 : PIECE_STEP_MS) : 160;
    const config = {
      duration,
      easing: Easing.inOut(Easing.quad),
      reduceMotion: ReduceMotion.System,
    };
    const xs = path.map(([, c], i) =>
      withTiming((c + 0.5) * cellSize + (i === path.length - 1 ? offset : 0), config),
    );
    const ys = path.map(([r], i) =>
      withTiming((r + 0.5) * cellSize - (i === path.length - 1 ? offset : 0), config),
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
  }, [id, color, progress, yardSlot, cellSize, offset, targetX, targetY, motionEnabled, x, y, hop]);
  const position = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value + hop.value }],
  }));
  // The hit area moves with the piece. Legal pieces stay above inactive safe-square stacks.
  const hitSize = Math.max(cellSize * 1.35, Math.min(44, cellSize * 1.9));
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
        label={`${color} piece ${yardSlot + 1}`}
        isTappable={Boolean(move)}
        motionEnabled={motionEnabled}
        size={cellSize * (progress === 0 ? 1.25 : 0.88)}
        hitSize={hitSize}
        onPress={move ? () => onSelectMove(move) : undefined}
      />
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
});
