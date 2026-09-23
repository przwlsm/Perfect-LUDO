import { AnimatedBoardRotation, AnimatedPiece3D } from './AnimatedPiece3D';
import { Canvas } from './ThreeCanvas';
import { View } from 'react-native';
import { PLAYER_COLORS, isSafeSquare, type GameState, type Move } from '@/domain';
import { getBoardTheme, type BoardTheme } from '../theme/themes';
import {
  GRID_SIZE,
  HOME_COLUMN_CELLS,
  TRACK_CELLS,
  YARD_BLOCKS,
  YARD_BLOCK_SIZE,
} from './boardLayout';
import { cellToPosition3D } from './cellToPosition3D';
import { getCellForPiece } from './getCellForPiece';

export interface Board3DProps {
  readonly state: GameState;
  readonly validMoves: readonly Move[] | null;
  readonly size: number;
  readonly theme?: BoardTheme;
  readonly rotation?: number;
  readonly motionEnabled?: boolean;
  onSelectMove(move: Move): void;
}

const CELL_SIZE = 0.92;

export function Board3D({
  state,
  validMoves,
  size,
  onSelectMove,
  theme = getBoardTheme('classic'),
  rotation = 0,
  motionEnabled = false,
}: Board3DProps): React.JSX.Element {
  const validMoveByPieceId = new Map((validMoves ?? []).map((move) => [move.pieceId, move]));

  const cellOccupancy = new Map<string, number>();
  const pieces = state.players.flatMap((player) =>
    player.pieces.map((piece, pieceIndex) => {
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
    <View style={{ width: size, height: size }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [0, 19, 15], fov: 48 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[6, 10, 4]} intensity={2} />
        <AnimatedBoardRotation rotation={rotation} motionEnabled={motionEnabled}>
          {/* Base board slab, sits just below every cell/piece. */}
          <mesh position={[0, -0.4, 0]}>
            <boxGeometry args={[GRID_SIZE + 0.6, 0.65, GRID_SIZE + 0.6]} />
            <meshStandardMaterial color={theme.frame} />
          </mesh>

          {PLAYER_COLORS.map((color) => {
            const block = YARD_BLOCKS[color];
            const centerRow = block.row + YARD_BLOCK_SIZE / 2 - 0.5;
            const centerCol = block.col + YARD_BLOCK_SIZE / 2 - 0.5;
            const [x, , z] = cellToPosition3D(centerRow, centerCol);
            return (
              <group key={`yard-${color}`}>
                <mesh position={[x, -0.02, z]}>
                  <boxGeometry args={[YARD_BLOCK_SIZE - 0.15, 0.18, YARD_BLOCK_SIZE - 0.15]} />
                  <meshStandardMaterial color={theme.colors[color]} />
                </mesh>
                <mesh position={[x, 0.08, z]}>
                  <boxGeometry args={[YARD_BLOCK_SIZE - 1.2, 0.08, YARD_BLOCK_SIZE - 1.2]} />
                  <meshStandardMaterial color={theme.tile} />
                </mesh>
              </group>
            );
          })}

          {TRACK_CELLS.map(([row, col], index) => {
            const [x, , z] = cellToPosition3D(row, col);
            return (
              <mesh key={`track-${index}`} position={[x, 0, z]}>
                <boxGeometry args={[CELL_SIZE, 0.12, CELL_SIZE]} />
                <meshStandardMaterial color={isSafeSquare(index) ? theme.accent : theme.tile} />
              </mesh>
            );
          })}

          {PLAYER_COLORS.map((color) =>
            HOME_COLUMN_CELLS[color].map(([row, col], step) => {
              const [x, , z] = cellToPosition3D(row, col);
              return (
                <mesh key={`home-${color}-${step}`} position={[x, 0, z]}>
                  <boxGeometry args={[CELL_SIZE, 0.12, CELL_SIZE]} />
                  <meshStandardMaterial color={theme.colors[color]} />
                </mesh>
              );
            }),
          )}

          {pieces.map(({ id, color, piece, yardSlot, stackIndex, move }) => (
            <AnimatedPiece3D
              key={id}
              piece={piece}
              yardSlot={yardSlot}
              stackIndex={stackIndex}
              fill={theme.colors[color]}
              move={move}
              motionEnabled={motionEnabled}
              onSelectMove={onSelectMove}
            />
          ))}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[2.9, 0.3, 2.9]} />
            <meshStandardMaterial color={theme.frame} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.6, 0.3, 0.7, 8]} />
            <meshStandardMaterial color={theme.accent} />
          </mesh>
        </AnimatedBoardRotation>
      </Canvas>
    </View>
  );
}
