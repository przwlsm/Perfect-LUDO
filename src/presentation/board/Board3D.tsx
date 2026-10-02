import { useMemo, useState } from 'react';
import { Shape } from 'three';
import {
  radialGrid,
  radialTrack,
  radialHome,
  radialHomeTriangle,
  radialYard,
} from './radialLayout';
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
import { turnColorOf } from './TurnGlow';
import { LudoLoader } from '../components/LudoLoader';
import { CAMERA_TARGET, RADIAL_FOV, radialCameraPosition } from './radialCamera';

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
  /** See Board2DProps.showTurn. In 3D the rim is lit steadily, without pulsing. */
  readonly showTurn?: boolean;
  onSelectMove(move: Move): void;
}

/** The 3D board renders this many times larger than shown (see the render). */
const SUPERSAMPLE = 1.5;
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
  showTurn = false,
}: Board3DProps): React.JSX.Element {
  const count = state.players.length;
  const extended = count > 4;
  // Radial (>4-player) boards have no "flip" concept; nothing enables it there.
  const flipClassic = flip && !extended;
  const rendered = size * SUPERSAMPLE;
  // The GL context takes a moment to start; the loader covers the blank until then.
  const [drawn, setDrawn] = useState(false);
  const grid = extended ? radialGrid(count) : GRID_SIZE;
  const colors = extended ? ALL_PLAYER_COLORS.slice(0, count) : PLAYER_COLORS;
  const track = extended ? radialTrack(count) : TRACK_CELLS;
  const yardSize = extended ? 3.7 : YARD_BLOCK_SIZE;
  const turnColor = showTurn ? turnColorOf(state) : null;
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
      {/* Drawn at SUPERSAMPLE times the size and shrunk to fit: edges come out
          smoother, and the pinch-zoomed board stays sharp instead of
          enlarging a low-resolution picture. */}
      <View
        style={{
          position: 'absolute',
          left: (size - rendered) / 2,
          top: (size - rendered) / 2,
          width: rendered,
          height: rendered,
          transform: [{ scale: 1 / SUPERSAMPLE }],
        }}
      >
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
              ? { position: [0, 30, 0], up: [0, 0, -1], zoom: rendered / grid }
              : // Tilted just enough to show the pieces' height and the frame's
                // depth while the whole board still fits a square viewport.
                {
                  position: extended ? [...radialCameraPosition(count)] : [0, 17.8, 12.4],
                  fov: RADIAL_FOV,
                }
          }
          // Aimed a touch in front of centre so the tilted board sits mid-frame
          // instead of leaving its top quarter empty.
          onCreated={({ camera }) => {
            camera.lookAt(...CAMERA_TARGET);
            // The first frame lands on the next tick; then the loader can go.
            requestAnimationFrame(() => setDrawn(true));
          }}
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
            {/* The crown on top of the centre; round tables keep their shared dice there instead. */}
            {!extended && (
              <>
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
              </>
            )}

            {turnColor && (
              <TurnRim3D
                color={theme.colors[turnColor]}
                triangle={
                  extended && homeStyle === 'triangle' ? radialHomeTriangle(turnColor, count) : null
                }
                extended={extended}
                grid={grid}
                yardSize={yardSize}
                center={
                  extended
                    ? radialYard(turnColor, count)
                    : (() => {
                        const block = yardBlock(turnColor as ClassicColor, flipClassic);
                        return [
                          block.row + YARD_BLOCK_SIZE / 2 - 0.5,
                          block.col + YARD_BLOCK_SIZE / 2 - 0.5,
                        ] as const;
                      })()
                }
              />
            )}

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
      {!drawn && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
        >
          <LudoLoader compact motionEnabled={motionEnabled} size={Math.min(170, size * 0.42)} />
        </View>
      )}
    </View>
  );
}

/**
 * The 3D twin of TurnGlow: a lit rim around the home of the player whose
 * turn it is. A white band edged in the player's colour, unlit so it reads
 * as glowing under any table light.
 */
function TurnRim3D({
  color,
  triangle,
  extended,
  grid,
  yardSize,
  center,
}: {
  color: string;
  /** Triangle homes: the triangle to outline, in grid cells. */
  triangle: { apex: readonly number[]; left: readonly number[]; right: readonly number[] } | null;
  extended: boolean;
  grid: number;
  yardSize: number;
  center: readonly [number, number];
}) {
  const [x, , z] = cellToPosition3D(center[0], center[1], 1, grid);
  if (triangle) {
    // White bars along the three edges, over a faint lift of the whole triangle.
    const corners = [triangle.apex, triangle.left, triangle.right].map(([row, col]) => {
      const [px, , pz] = cellToPosition3D(row!, col!, 1, grid);
      return { x: px, z: pz };
    });
    const outline = new Shape();
    corners.forEach(({ x: px, z: pz }, i) =>
      i === 0 ? outline.moveTo(px, -pz) : outline.lineTo(px, -pz),
    );
    outline.closePath();
    return (
      <group>
        <mesh position={[0, 0.14, 0]} rotation={FLAT}>
          <shapeGeometry args={[outline]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.14} />
        </mesh>
        {corners.map((from, i) => {
          const to = corners[(i + 1) % 3]!;
          const length = Math.hypot(to.x - from.x, to.z - from.z);
          return (
            <mesh
              key={i}
              position={[(from.x + to.x) / 2, 0.19, (from.z + to.z) / 2]}
              rotation={[0, -Math.atan2(to.z - from.z, to.x - from.x), 0]}
            >
              <boxGeometry args={[length + 0.26, 0.06, 0.26]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          );
        })}
      </group>
    );
  }
  if (extended) {
    // Round homes: a ring around the yard.
    const inner = 1.9;
    return (
      <group position={[x, 0.19, z]} rotation={FLAT}>
        <mesh>
          <ringGeometry args={[inner + 0.16, inner + 0.42, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.005]}>
          <ringGeometry args={[inner, inner + 0.16, 48]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    );
  }
  // Classic yards are already in the player's colour: a white frame along the edge.
  const half = yardSize / 2 - 0.06;
  const bar = 0.2;
  const sides = [
    { at: [0, -half + bar / 2], size: [yardSize - 0.12, bar] },
    { at: [0, half - bar / 2], size: [yardSize - 0.12, bar] },
    { at: [-half + bar / 2, 0], size: [bar, yardSize - 0.12] },
    { at: [half - bar / 2, 0], size: [bar, yardSize - 0.12] },
  ] as const;
  return (
    <group position={[x, 0.16, z]}>
      {sides.map(({ at, size }, i) => (
        <mesh key={i} position={[at[0], 0, at[1]]}>
          <boxGeometry args={[size[0], 0.05, size[1]]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}
