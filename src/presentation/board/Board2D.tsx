import { StyleSheet, Text, View } from 'react-native';
import { PLAYER_COLORS, isSafeSquare, type GameState, type Move, type Piece } from '@/domain';
import { AnimatedPiece2D } from './AnimatedPiece2D';
import { getBoardTheme, type BoardTheme } from '../theme/themes';
import {
  GRID_SIZE,
  HOME_COLUMN_CELLS,
  TRACK_CELLS,
  YARD_BLOCKS,
  YARD_BLOCK_SIZE,
} from './boardLayout';
import { getCellForPiece } from './getCellForPiece';

export interface Board2DProps {
  readonly state: GameState;
  readonly validMoves: readonly Move[] | null;
  readonly size: number;
  readonly theme?: BoardTheme;
  readonly motionEnabled?: boolean;
  onSelectMove(move: Move): void;
}

interface RenderablePiece {
  readonly piece: Piece;
  readonly yardSlot: number;
  readonly id: string;
  readonly color: (typeof PLAYER_COLORS)[number];
  readonly row: number;
  readonly col: number;
  readonly stackIndex: number;
  readonly move: Move | undefined;
}

export function Board2D({
  state,
  validMoves,
  size,
  onSelectMove,
  theme = getBoardTheme('classic'),
  motionEnabled = false,
}: Board2DProps): React.JSX.Element {
  const cellSize = size / GRID_SIZE;
  const validMoveByPieceId = new Map((validMoves ?? []).map((move) => [move.pieceId, move]));

  const cellOccupancy = new Map<string, number>();
  const pieces: RenderablePiece[] = state.players.flatMap((player) =>
    player.pieces.map((piece, pieceIndex): RenderablePiece => {
      const [row, col] = getCellForPiece(piece, pieceIndex);
      const key = `${row},${col}`;
      const stackIndex = cellOccupancy.get(key) ?? 0;
      cellOccupancy.set(key, stackIndex + 1);
      return {
        piece,
        yardSlot: pieceIndex,
        id: piece.id,
        color: piece.color,
        row,
        col,
        stackIndex,
        move: validMoveByPieceId.get(piece.id),
      };
    }),
  );

  return (
    <View style={[styles.board, { width: size, height: size, backgroundColor: theme.tile }]}>
      {PLAYER_COLORS.map((color) => {
        const block = YARD_BLOCKS[color];
        return (
          <View
            key={`yard-${color}`}
            style={[
              styles.yard,
              {
                left: block.col * cellSize,
                top: block.row * cellSize,
                width: YARD_BLOCK_SIZE * cellSize,
                height: YARD_BLOCK_SIZE * cellSize,
                backgroundColor: theme.colors[color],
                borderColor: theme.colors[color],
              },
            ]}
          >
            <View
              style={{
                position: 'absolute',
                inset: cellSize * 0.65,
                backgroundColor: theme.tile,
                borderRadius: cellSize * 0.65,
                borderWidth: 2,
                borderColor: '#00000015',
              }}
            />
          </View>
        );
      })}

      {TRACK_CELLS.map(([row, col], index) => (
        <View
          key={`track-${index}`}
          style={[
            styles.cell,
            {
              left: col * cellSize,
              top: row * cellSize,
              width: cellSize,
              height: cellSize,
              backgroundColor:
                index % 13 === 0
                  ? theme.colors[PLAYER_COLORS[Math.floor(index / 13)]!]
                  : theme.tile,
              borderColor: theme.line,
            },
          ]}
        >
          <Text
            style={{
              fontSize: cellSize * 0.65,
              lineHeight: cellSize,
              textAlign: 'center',
              color: index % 13 === 0 ? '#ffffff' : '#8190a5',
            }}
          >
            {isSafeSquare(index)
              ? index % 13 === 0
                ? ['→', '↓', '←', '↑'][Math.floor(index / 13)]
                : '☆'
              : ''}
          </Text>
        </View>
      ))}

      {PLAYER_COLORS.map((color) =>
        HOME_COLUMN_CELLS[color].map(([row, col], step) => (
          <View
            key={`home-${color}-${step}`}
            style={[
              styles.cell,
              {
                left: col * cellSize,
                top: row * cellSize,
                width: cellSize,
                height: cellSize,
                backgroundColor: theme.colors[color],
                borderColor: theme.line,
              },
            ]}
          />
        )),
      )}

      <View
        style={{
          position: 'absolute',
          left: cellSize * 6,
          top: cellSize * 6,
          width: cellSize * 3,
          height: cellSize * 3,
        }}
      >
        <View
          style={{
            width: 0,
            height: 0,
            borderTopWidth: cellSize * 1.5,
            borderBottomWidth: cellSize * 1.5,
            borderLeftWidth: cellSize * 1.5,
            borderRightWidth: cellSize * 1.5,
            borderTopColor: theme.colors.GREEN,
            borderRightColor: theme.colors.YELLOW,
            borderBottomColor: theme.colors.BLUE,
            borderLeftColor: theme.colors.RED,
          }}
        />
        <Text
          style={{
            position: 'absolute',
            alignSelf: 'center',
            top: cellSize * 0.83,
            color: '#fff8e9',
            fontSize: cellSize,
            textShadowColor: '#00000040',
            textShadowRadius: 3,
          }}
        >
          ♛
        </Text>
      </View>

      {pieces.map(({ id, piece, yardSlot, color, stackIndex, move }) => (
        <AnimatedPiece2D
          key={id}
          piece={piece}
          yardSlot={yardSlot}
          cellSize={cellSize}
          fill={theme.colors[color]}
          stackIndex={stackIndex}
          move={move}
          motionEnabled={motionEnabled}
          onSelectMove={onSelectMove}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: 'relative',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    overflow: 'hidden',
  },
  yard: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  cell: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
});
