import { useMemo } from 'react';
import { Shape } from 'three';
import { radialTrack, radialHome, radialHomeTriangle, radialYard } from './radialLayout';
import {
  type ClassicColor,
  ALL_PLAYER_COLORS,
  PLAYER_COLORS,
  isSafeSquare,
  type GameState,
  type Move,
  type PlayerColor,
} from '@/domain';
import { AnimatedBoardRotation, AnimatedPiece3D } from './AnimatedPiece3D';
import { Canvas } from './ThreeCanvas';
import { View } from 'react-native';
import { getBoardTheme, type BoardTheme } from '../theme/themes';
import {
  flipTrackSquare,
  GRID_SIZE,
  homeColumnCells,
  OPPOSITE_COLOR,
  TRACK_CELLS,
  yardBlock,
  YARD_BLOCK_SIZE,
  yardRestSpots,
} from './boardLayout';
import { cellToPosition3D } from './cellToPosition3D';
import { getCellForPiece } from './getCellForPiece';
import { shade } from './shade';

export interface Board3DProps {
  readonly state: GameState;
  readonly validMoves: readonly Move[] | null;
  readonly size: number;
  readonly theme?: BoardTheme;
  readonly rotation?: number;
  /** Straight-down orthographic view; off by default because it reads as flat. */
  readonly topDown?: boolean;
  readonly motionEnabled?: boolean;
  /** See Board2DProps.flip — same 2-player, opposite-corner relabeling. */
  readonly flip?: boolean;
  /** See Board2DProps.homeStyle — 5-6 player tables only. */
  readonly homeStyle?: 'triangle' | 'round';
  onSelectMove(move: Move): void;
}

const CELL_SIZE = 0.92;
const CELL_HEIGHT = 0.12;
/** Just above the cell tops, so markers never z-fight with the tile beneath. */
const MARKER_Y = CELL_HEIGHT / 2 + 0.012;
const CENTER_HALF = 1.5;

/** A five-point star, drawn once and shared by every safe square. */
function starShape(outer: number, inner: number): Shape {
  const shape = new Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * The four home wedges meeting at the centre, in shape space where +y is
 * "up the screen" (it becomes -z once laid flat). Order: top, right,
 * bottom, left — the same order Board2D colours its centre in.
 */
function wedgeShapes(half: number): readonly Shape[] {
  const corners: readonly (readonly [number, number])[] = [
    [-half, half],
    [half, half],
    [half, -half],
    [-half, -half],
  ];
  return corners.map((corner, i) => {
    const next = corners[(i + 1) % 4]!;
    const shape = new Shape();
    shape.moveTo(corner[0], corner[1]);
    shape.lineTo(next[0], next[1]);
    shape.lineTo(0, 0);
    shape.closePath();
    return shape;
  });
}

const STAR = starShape(0.3, 0.13);

/**
 * A 5-6 player triangle home as a flat shape, in the same plane convention
 * as STAR (shape x/y become world x/-z once laid FLAT).
 */
function homeTriangle(color: PlayerColor, count: number, grid: number): Shape {
  const { apex, left, right } = radialHomeTriangle(color, count);
  const shape = new Shape();
  [apex, left, right].forEach(([row, col], i) => {
    const [x, , z] = cellToPosition3D(row, col, 1, grid);
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  return shape;
}
const WEDGES = wedgeShapes(CENTER_HALF);
/** Which colour each centre wedge belongs to (top, right, bottom, left). */
const WEDGE_OWNERS: readonly ClassicColor[] = ['GREEN', 'YELLOW', 'BLUE', 'RED'];
/** Lays a shape drawn in the XY plane flat on the board with +y facing up the screen. */
const FLAT: readonly [number, number, number] = [-Math.PI / 2, 0, 0];

export function Board3D({
  state,
  validMoves,
  size,
  onSelectMove,
  theme = getBoardTheme('classic'),
  rotation = 0,
  topDown = false,
  motionEnabled = false,
  flip = false,
  homeStyle = 'triangle',
}: Board3DProps): React.JSX.Element {
  const count = state.players.length;
  const extended = count > 4;
  // Radial (>4-player) boards have no "flip" concept; nothing enables it there.
  const flipClassic = flip && !extended;
  const grid = extended ? 19 : GRID_SIZE;
  const colors = extended ? ALL_PLAYER_COLORS.slice(0, count) : PLAYER_COLORS;
  const track = extended ? radialTrack(count) : TRACK_CELLS;
  const yardSize = extended ? 3.7 : YARD_BLOCK_SIZE;
  const validMoveByPieceId = new Map((validMoves ?? []).map((move) => [move.pieceId, move]));
  const frameDark = useMemo(() => shade(theme.frame, -0.35), [theme.frame]);
  const frameLight = useMemo(() => shade(theme.frame, 0.12), [theme.frame]);
  const tileEdge = useMemo(() => shade(theme.tile, -0.08), [theme.tile]);

  const cellOccupancy = new Map<string, number>();
  const pieces = state.players.flatMap((player) =>
    player.pieces.map((piece, pieceIndex) => {
      const [row, col] = getCellForPiece(piece, pieceIndex, count, flipClassic);
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

  /** Owner of an entry square, honouring the 2-player flip like Board2D does. */
  const entryOwner = (index: number): ClassicColor =>
    PLAYER_COLORS[Math.floor((flipClassic ? flipTrackSquare(index) : index) / 13)]!;
  const wedgeColor = (owner: ClassicColor) =>
    theme.colors[flipClassic ? OPPOSITE_COLOR[owner] : owner];

  return (
    <View style={{ width: size, height: size }}>
      {/* Keyed on size: the native GL surface does not reliably follow a
          resize (e.g. rotating the phone), leaving the scene drawn at the old
          scale inside the new bounds. Remounting is cheap and always correct. */}
      <Canvas
        key={Math.round(size)}
        frameloop="demand"
        dpr={[1, 2]}
        orthographic={topDown}
        camera={
          topDown
            ? { position: [0, 30, 0], up: [0, 0, -1], zoom: size / grid }
            : // Tilted just enough to show the pieces' height and the frame's
              // depth while the whole board still fits a square viewport.
              { position: extended ? [0, 23, 14.5] : [0, 17.8, 12.4], fov: 42 }
        }
        // Aimed a touch in front of centre so the tilted board sits mid-frame
        // instead of leaving its top quarter empty.
        onCreated={({ camera }) => camera.lookAt(0, 0, 0.9)}
      >
        {/* Sky/ground split gives the tokens a top highlight and a darker underside. */}
        <hemisphereLight args={['#ffffff', '#2c3350', 0.9]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 12, 7]} intensity={1.5} />
        <directionalLight position={[-6, 6, -4]} intensity={0.35} />
        <AnimatedBoardRotation rotation={rotation} motionEnabled={motionEnabled}>
          {/* Two-tier frame: a darker base under a lighter rim reads as a bevel. */}
          <mesh position={[0, -0.62, 0]}>
            {extended ? (
              <cylinderGeometry args={[grid / 2 + 0.6, grid / 2 + 0.6, 0.7, 64]} />
            ) : (
              <boxGeometry args={[grid + 1.3, 0.7, grid + 1.3]} />
            )}
            <meshStandardMaterial color={frameDark} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            {extended ? (
              <cylinderGeometry args={[grid / 2 + 0.3, grid / 2 + 0.3, 0.32, 64]} />
            ) : (
              <boxGeometry args={[grid + 0.7, 0.32, grid + 0.7]} />
            )}
            <meshStandardMaterial color={frameLight} roughness={0.7} />
          </mesh>
          {/* Playing surface, a hair below the cells so their edges catch light. */}
          <mesh position={[0, -0.05, 0]}>
            {extended ? (
              <cylinderGeometry args={[grid / 2, grid / 2, 0.08, 64]} />
            ) : (
              <boxGeometry args={[grid, 0.08, grid]} />
            )}
            <meshStandardMaterial color={tileEdge} roughness={0.9} />
          </mesh>

          {colors.map((color) => {
            const block = yardBlock(color as ClassicColor, flipClassic);
            const [centerRow, centerCol] = extended
              ? radialYard(color, count)
              : [block.row + YARD_BLOCK_SIZE / 2 - 0.5, block.col + YARD_BLOCK_SIZE / 2 - 0.5];
            const [x, , z] = cellToPosition3D(centerRow, centerCol, 1, grid);
            if (extended && homeStyle === 'triangle')
              return (
                <group key={`yard-${color}`}>
                  {/* Raised coloured triangle filling the wedge between the arms. */}
                  <mesh position={[0, -0.09, 0]} rotation={FLAT}>
                    <extrudeGeometry
                      args={[
                        homeTriangle(color, count, grid),
                        { depth: 0.22, bevelEnabled: false },
                      ]}
                    />
                    <meshStandardMaterial color={theme.colors[color]} roughness={0.55} />
                  </mesh>
                  <mesh position={[x, 0.14, z]}>
                    <cylinderGeometry args={[1.45, 1.45, 0.06, 40]} />
                    <meshStandardMaterial color={theme.tile} roughness={0.9} />
                  </mesh>
                </group>
              );
            return (
              <group key={`yard-${color}`}>
                <mesh position={[x, 0.02, z]}>
                  {extended ? (
                    <cylinderGeometry args={[1.85, 1.85, 0.22, 40]} />
                  ) : (
                    <boxGeometry args={[yardSize - 0.12, 0.22, yardSize - 0.12]} />
                  )}
                  <meshStandardMaterial color={theme.colors[color]} roughness={0.55} />
                </mesh>
                <mesh position={[x, 0.14, z]}>
                  {extended ? (
                    <cylinderGeometry args={[1.5, 1.5, 0.06, 40]} />
                  ) : (
                    <boxGeometry args={[yardSize - 1.4, 0.06, yardSize - 1.4]} />
                  )}
                  <meshStandardMaterial color={theme.tile} roughness={0.9} />
                </mesh>
                {/* Rest spots, so an empty yard still shows where four coins live. */}
                {!extended &&
                  yardRestSpots(color as ClassicColor, flipClassic).map(([row, col], i) => {
                    const [sx, , sz] = cellToPosition3D(row, col, 1, grid);
                    return (
                      <mesh key={`rest-${color}-${i}`} position={[sx, 0.175, sz]}>
                        <cylinderGeometry args={[0.5, 0.5, 0.02, 28]} />
                        <meshStandardMaterial color={shade(theme.tile, -0.1)} roughness={1} />
                      </mesh>
                    );
                  })}
              </group>
            );
          })}

          {track.map(([row, col], index) => {
            const [x, , z] = cellToPosition3D(row, col, 1, grid);
            const entry = !extended && index % 13 === 0;
            const star = isSafeSquare(index, count) && !entry;
            return (
              <group key={`track-${index}`} position={[x, 0, z]}>
                <mesh
                  rotation={[
                    0,
                    extended
                      ? (-(Math.floor(index / 13) + (index % 13 >= 5 ? 1 : 0)) * Math.PI * 2) /
                        count
                      : 0,
                    0,
                  ]}
                >
                  <boxGeometry args={[CELL_SIZE, CELL_HEIGHT, CELL_SIZE]} />
                  <meshStandardMaterial
                    color={
                      entry
                        ? theme.colors[entryOwner(index)]
                        : extended && isSafeSquare(index, count)
                          ? theme.accent
                          : theme.tile
                    }
                    roughness={0.8}
                  />
                </mesh>
                {star && (
                  <mesh position={[0, MARKER_Y, 0]} rotation={FLAT}>
                    <shapeGeometry args={[STAR]} />
                    <meshStandardMaterial color={theme.accent} roughness={0.5} />
                  </mesh>
                )}
              </group>
            );
          })}

          {colors.map((color) =>
            (extended
              ? radialHome(color, count)
              : homeColumnCells(color as ClassicColor, flipClassic)
            ).map(([row, col], step) => {
              const [x, , z] = cellToPosition3D(row, col, 1, grid);
              return (
                <mesh
                  key={`home-${color}-${step}`}
                  position={[x, 0.01, z]}
                  rotation={[
                    0,
                    extended ? (-ALL_PLAYER_COLORS.indexOf(color) * Math.PI * 2) / count : 0,
                    0,
                  ]}
                >
                  <boxGeometry args={[CELL_SIZE, CELL_HEIGHT + 0.02, CELL_SIZE]} />
                  <meshStandardMaterial color={theme.colors[color]} roughness={0.6} />
                </mesh>
              );
            }),
          )}

          {/* Centre: four coloured wedges under a small crown, as on the 2D board. */}
          {extended ? (
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[1.5, 1.5, 0.3, 32]} />
              <meshStandardMaterial color={theme.frame} />
            </mesh>
          ) : (
            WEDGES.map((wedge, i) => (
              <mesh key={`wedge-${i}`} position={[0, MARKER_Y, 0]} rotation={FLAT}>
                <shapeGeometry args={[wedge]} />
                <meshStandardMaterial color={wedgeColor(WEDGE_OWNERS[i]!)} roughness={0.6} />
              </mesh>
            ))
          )}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.55, 0.65, 0.16, 24]} />
            <meshStandardMaterial color={frameLight} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.36, 0.3, 0.5, 8]} />
            <meshStandardMaterial color={theme.accent} roughness={0.35} metalness={0.25} />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <sphereGeometry args={[0.16, 16, 12]} />
            <meshStandardMaterial color={theme.accent} roughness={0.3} metalness={0.3} />
          </mesh>

          {pieces.map(({ id, color, piece, yardSlot, stackIndex, move }) => (
            <AnimatedPiece3D
              key={id}
              piece={piece}
              playerCount={count}
              yardSlot={yardSlot}
              stackIndex={stackIndex}
              stackCount={
                pieces.filter(
                  (p) =>
                    p.row === getCellForPiece(piece, yardSlot, count, flipClassic)[0] &&
                    p.col === getCellForPiece(piece, yardSlot, count, flipClassic)[1],
                ).length
              }
              fill={theme.colors[color]}
              pieceStyle={theme.pieceStyle}
              flip={flipClassic}
              move={move}
              motionEnabled={motionEnabled}
              onSelectMove={onSelectMove}
            />
          ))}
        </AnimatedBoardRotation>
      </Canvas>
    </View>
  );
}
