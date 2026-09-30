import { RadialBoard2D } from './RadialBoard2D';
import { StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import {
  PLAYER_COLORS,
  isSafeSquare,
  type GameState,
  type Move,
  type Piece,
  type PlayerColor,
} from '@/domain';
import { AnimatedPiece2D } from './AnimatedPiece2D';
import { getBoardTheme, type BoardTheme } from '../theme/themes';
import {
  flipTrackSquare,
  GRID_SIZE,
  homeColumnCells,
  TRACK_CELLS,
  yardBlock,
  YARD_BLOCK_SIZE,
  yardRestSpots,
} from './boardLayout';
import { getCellForPiece } from './getCellForPiece';

const ENTRY_ARROWS = ['→', '↓', '←', '↑'] as const;

export interface Board2DProps {
  readonly state: GameState;
  readonly validMoves: readonly Move[] | null;
  readonly size: number;
  readonly theme?: BoardTheme;
  readonly motionEnabled?: boolean;
  /**
   * Renders every seat at its diagonally-opposite corner, so a 2-player
   * table can put the local player's colour at the bottom of the screen
   * regardless of which colour they actually hold. The board is symmetric
   * under a 180° turn (see boardLayout.ts), so this relabels which corner
   * each colour uses rather than recomputing any geometry.
   */
  readonly flip?: boolean;
  /** 5-6 player tables only: triangle homes (default) or the original round ones. */
  readonly homeStyle?: 'triangle' | 'round';
  onSelectMove(move: Move): void;
}

interface RenderablePiece {
  readonly piece: Piece;
  readonly yardSlot: number;
  readonly id: string;
  readonly color: PlayerColor;
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
  flip = false,
  homeStyle = 'triangle',
}: Board2DProps): React.JSX.Element {
  if (state.players.length > 4)
    return (
      <RadialBoard2D
        state={state}
        validMoves={validMoves}
        size={size}
        theme={theme}
        motionEnabled={motionEnabled}
        homeStyle={homeStyle}
        onSelectMove={onSelectMove}
      />
    );
  const cellSize = size / GRID_SIZE;
  const validMoveByPieceId = new Map((validMoves ?? []).map((move) => [move.pieceId, move]));

  const cellOccupancy = new Map<string, number>();
  const pieces: RenderablePiece[] = state.players.flatMap((player) =>
    player.pieces.map((piece, pieceIndex): RenderablePiece => {
      const [row, col] = getCellForPiece(piece, pieceIndex, state.players.length, flip);
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
      {theme.wood && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: 45 }, (_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: (size * i) / 45,
                height: i % 4 === 0 ? 2 : 1,
                backgroundColor: i % 3 === 0 ? '#ffffff25' : '#8c693515',
              }}
            />
          ))}
        </View>
      )}
      {PLAYER_COLORS.map((color) => {
        const block = yardBlock(color, flip);
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
                backgroundColor: theme.wood ? theme.tile : theme.colors[color],
                borderColor: theme.colors[color],
              },
            ]}
          >
            <View
              style={{
                position: 'absolute',
                inset: cellSize * (theme.wood ? 0.25 : 0.65),
                backgroundColor: theme.wood ? theme.colors[color] : theme.tile,
                borderRadius: theme.wood ? cellSize * 3 : cellSize * 0.65,
                borderWidth: 2,
                borderColor: '#00000015',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* A faint embossed die, so an emptied yard never looks blank. */}
              <View
                style={{
                  width: cellSize * 2.3,
                  height: cellSize * 2.3,
                  borderRadius: cellSize * 0.55,
                  borderWidth: Math.max(2, cellSize * 0.13),
                  borderColor: theme.wood ? `${theme.tile}45` : `${theme.colors[color]}2a`,
                }}
              >
                {(
                  [
                    [0.22, 0.22],
                    [0.22, 0.78],
                    [0.5, 0.5],
                    [0.78, 0.22],
                    [0.78, 0.78],
                  ] as const
                ).map(([top, left]) => (
                  <View
                    key={`${top}-${left}`}
                    style={{
                      position: 'absolute',
                      top: `${top * 100 - 9}%`,
                      left: `${left * 100 - 9}%`,
                      width: '18%',
                      height: '18%',
                      borderRadius: cellSize,
                      backgroundColor: theme.wood ? `${theme.tile}45` : `${theme.colors[color]}2a`,
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        );
      })}

      {theme.wood &&
        PLAYER_COLORS.flatMap((color) =>
          yardRestSpots(color, flip).map(([row, col], index) => (
            <View
              key={`rest-${color}-${index}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: (col - 0.15) * cellSize,
                top: (row - 0.15) * cellSize,
                width: cellSize * 1.3,
                height: cellSize * 1.3,
                borderRadius: cellSize,
                backgroundColor: theme.tile,
                borderWidth: 1,
                borderColor: '#00000035',
              }}
            />
          )),
        )}
      {TRACK_CELLS.map(([row, col], index) => {
        // Physically fixed cell; only which colour's entry marker paints it
        // moves under a flip, and always to another entry cell (both are
        // multiples of 13 apart, see flipTrackSquare).
        const entryIndex = flip ? flipTrackSquare(index) : index;
        return (
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
                    ? theme.colors[PLAYER_COLORS[Math.floor(entryIndex / 13)]!]
                    : theme.wood
                      ? `${theme.tile}d9`
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
                  ? ENTRY_ARROWS[Math.floor(entryIndex / 13)]
                  : '☆'
                : ''}
            </Text>
          </View>
        );
      })}

      {PLAYER_COLORS.map((color) =>
        homeColumnCells(color, flip).map(([row, col], step) => (
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
            borderTopColor: theme.colors[flip ? 'BLUE' : 'GREEN'],
            borderRightColor: theme.colors[flip ? 'RED' : 'YELLOW'],
            borderBottomColor: theme.colors[flip ? 'GREEN' : 'BLUE'],
            borderLeftColor: theme.colors[flip ? 'YELLOW' : 'RED'],
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
          pieceStyle={theme.pieceStyle}
          flip={flip}
          stackIndex={stackIndex}
          stackCount={
            pieces.filter(
              (p) =>
                p.row === getCellForPiece(piece, yardSlot, state.players.length, flip)[0] &&
                p.col === getCellForPiece(piece, yardSlot, state.players.length, flip)[1],
            ).length
          }
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
