import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { LINES, NODE_COUNT, nodeName, type GameState, type Move, type Node } from 'baghchal-engine';
import type { PieceView } from '@/application/board/PieceTracker';
import { colors } from '../theme/colors';
import { DEFAULT_LOOK, type BoardLook } from '../theme/cosmetics';
import { nodePosition, type Position } from './geometry';

interface BoardProps {
  readonly size: number;
  readonly game: GameState;
  readonly pieces: readonly PieceView[];
  readonly selected: Node | null;
  readonly targets: readonly Node[];
  /** A suggested move to show, or null. */
  readonly hint: Move | null;
  /** The equipped board and piece colours. */
  readonly look?: BoardLook;
  readonly onTap: (node: Node) => void;
}

/** The outer lines sit this far in from the board's edge, as a share of its width. */
const INSET = 0.1;
const SLIDE = { duration: 220 };
const POP = { damping: 14, stiffness: 220 };

/**
 * The board: lines and points drawn once as vectors, a piece per view so each
 * slides to its new point on the UI thread, and a round touch target on every
 * point above them all.
 */
export function Board({
  size,
  game,
  pieces,
  selected,
  targets,
  hint,
  look = DEFAULT_LOOK,
  onTap,
}: BoardProps) {
  const inset = size * INSET;
  const radius = size * 0.052;
  const hit = radius * 2.3;
  const at = (node: Node) => nodePosition(node, size, inset);
  const nodes = Array.from({ length: NODE_COUNT }, (_, node) => node);
  return (
    <View
      style={[
        styles.board,
        { width: size, height: size, borderRadius: size * 0.04, backgroundColor: look.board },
      ]}
    >
      <Svg width={size} height={size} pointerEvents="none">
        {LINES.map(([a, b]) => {
          const p = at(a);
          const q = at(b);
          return (
            <Line
              key={`${a}-${b}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke={look.boardLine}
              strokeWidth={size * 0.008}
              strokeLinecap="round"
            />
          );
        })}
        {nodes.map((node) => {
          const p = at(node);
          return <Circle key={node} cx={p.x} cy={p.y} r={size * 0.014} fill={look.boardLine} />;
        })}
        {targets.map((node) => {
          const p = at(node);
          return (
            <Circle
              key={`target-${node}`}
              cx={p.x}
              cy={p.y}
              r={radius * 0.9}
              fill={colors.targetFill}
              stroke={colors.target}
              strokeWidth={size * 0.008}
            />
          );
        })}
        {hint && hint.kind !== 'place' && (
          <Line
            x1={at(hint.from).x}
            y1={at(hint.from).y}
            x2={at(hint.to).x}
            y2={at(hint.to).y}
            stroke={colors.selected}
            strokeWidth={size * 0.012}
            strokeLinecap="round"
            strokeDasharray={`${size * 0.02} ${size * 0.018}`}
          />
        )}
      </Svg>
      {hint && <HintRing position={at(hint.to)} radius={radius} />}
      {pieces.map((piece) => (
        <Piece
          key={piece.id}
          piece={piece}
          position={at(piece.node)}
          radius={radius}
          selected={selected === piece.node}
          look={look}
        />
      ))}
      {nodes.map((node) => {
        const p = at(node);
        return (
          <Pressable
            key={`tap-${node}`}
            onPress={() => onTap(node)}
            accessibilityRole="button"
            accessibilityLabel={labelFor(node, game)}
            accessibilityState={{ selected: selected === node }}
            style={{
              position: 'absolute',
              left: p.x - hit / 2,
              top: p.y - hit / 2,
              width: hit,
              height: hit,
              borderRadius: hit / 2,
            }}
          />
        );
      })}
    </View>
  );
}

function labelFor(node: Node, game: GameState): string {
  const cell = game.board[node];
  const what = cell === 'T' ? 'tiger' : cell === 'G' ? 'goat' : 'empty';
  return `${nodeName(node)}, ${what}`;
}

/** A ring that breathes on the point a hint says to play to. */
function HintRing({ position, radius }: { readonly position: Position; readonly radius: number }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.25, { duration: 600 }), -1, true);
  }, [pulse]);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const outer = radius * 1.2;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: position.x - outer,
          top: position.y - outer,
          width: outer * 2,
          height: outer * 2,
          borderRadius: outer,
          borderWidth: radius * 0.18,
          borderColor: colors.selected,
        },
        motion,
      ]}
    />
  );
}

interface PieceProps {
  readonly piece: PieceView;
  readonly position: Position;
  readonly radius: number;
  readonly selected: boolean;
  readonly look: BoardLook;
}

function Piece({ piece, position, radius, selected, look }: PieceProps) {
  const x = useSharedValue(position.x);
  const y = useSharedValue(position.y);
  // A placed goat pops onto the board; tigers are there from the first frame.
  const scale = useSharedValue(piece.kind === 'G' ? 0 : 1);

  useEffect(() => {
    x.value = withTiming(position.x, SLIDE);
    y.value = withTiming(position.y, SLIDE);
  }, [position.x, position.y, x, y]);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.18 : 1, POP);
  }, [selected, scale]);

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  const tiger = piece.kind === 'T';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        {
          left: -radius,
          top: -radius,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          borderWidth: radius * 0.16,
          backgroundColor: tiger ? look.tiger : look.goat,
          borderColor: selected ? colors.selected : tiger ? look.tigerEdge : look.goatEdge,
        },
        motion,
      ]}
    >
      {tiger && (
        <View
          style={[
            styles.stripe,
            { width: radius * 0.9, height: radius * 0.2, backgroundColor: look.tigerEdge },
          ]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: colors.board,
    alignSelf: 'center',
  },
  piece: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stripe: {
    backgroundColor: colors.tigerEdge,
    borderRadius: 999,
  },
});
