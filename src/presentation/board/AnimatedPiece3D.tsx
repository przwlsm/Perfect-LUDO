import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from './ThreeCanvas';
import { Group, Mesh } from 'three';
import type { Move, Piece } from '@/domain';
import { cellToPosition3D } from './cellToPosition3D';
import { getCellForPiece } from './getCellForPiece';
import { getPieceWaypoints, PIECE_JUMP_MS, PIECE_STEP_MS } from './pieceMotion';
import { shade } from './shade';

type Point = readonly [number, number, number];
export function AnimatedPiece3D({
  piece,
  playerCount = 4,
  yardSlot,
  stackIndex,
  stackCount = 1,
  fill,
  pieceStyle = 'pawn',
  flip = false,
  move,
  motionEnabled,
  onSelectMove,
}: {
  piece: Piece;
  playerCount?: number;
  yardSlot: number;
  stackIndex: number;
  stackCount?: number;
  fill: string;
  /** Matches the theme's 2D token look: a squat coin, or a pawn with a head. */
  pieceStyle?: 'coin' | 'pawn';
  /** See Board2DProps.flip. Must match the board it is drawn on. */
  flip?: boolean;
  move?: Move;
  motionEnabled: boolean;
  onSelectMove(move: Move): void;
}) {
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const previous = useRef<number | null>(null);
  const motion = useRef<{ points: Point[]; elapsed: number; step: number } | null>(null);
  const resting = useRef<Point>([0, 0.2, 0]);
  const invalidate = useThree((state) => state.invalidate);
  const { id, color, progress } = piece;
  useLayoutEffect(() => {
    const columns = Math.ceil(Math.sqrt(stackCount));
    const offset = stackCount > 1 ? ((stackIndex % columns) - (columns - 1) / 2) * 0.48 : 0;
    const offsetZ =
      stackCount > 1
        ? (Math.floor(stackIndex / columns) - (Math.ceil(stackCount / columns) - 1) / 2) * 0.48
        : 0;
    const toPoint = ([row, col]: readonly [number, number]): Point => {
      const [x, , z] = cellToPosition3D(row, col, 1, playerCount > 4 ? 19 : 15);
      return [x + offset, 0.2, z + offsetZ];
    };
    resting.current = toPoint(
      getCellForPiece({ id, color, progress }, yardSlot, playerCount, flip),
    );
    if (
      group.current &&
      motionEnabled &&
      previous.current !== null &&
      previous.current !== progress
    ) {
      const cells = getPieceWaypoints(
        { id, color, progress },
        previous.current,
        yardSlot,
        playerCount,
        flip,
      );
      motion.current = {
        points: [
          [group.current.position.x, group.current.position.y, group.current.position.z],
          ...cells.map(toPoint),
        ],
        elapsed: 0,
        step: (cells.length === 1 ? PIECE_JUMP_MS : PIECE_STEP_MS) / 1000,
      };
    } else {
      motion.current = null;
      group.current?.position.set(...resting.current);
    }
    previous.current = progress;
    invalidate();
  }, [
    playerCount,
    flip,
    id,
    color,
    progress,
    yardSlot,
    stackIndex,
    stackCount,
    motionEnabled,
    invalidate,
  ]);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const tween = motion.current;
    const pulse = move && motionEnabled ? (Math.sin(clock.elapsedTime * 3.6) + 1) / 2 : 0;
    if (tween && motionEnabled) {
      tween.elapsed += Math.min(delta, 0.05);
      const index = Math.min(Math.floor(tween.elapsed / tween.step), tween.points.length - 2);
      const t = Math.min(1, (tween.elapsed - index * tween.step) / tween.step);
      const a = tween.points[index]!;
      const b = tween.points[index + 1]!;
      const smooth = t * t * (3 - 2 * t);
      group.current.position.set(
        a[0] + (b[0] - a[0]) * smooth,
        a[1] + (b[1] - a[1]) * smooth + Math.sin(t * Math.PI) * 0.35,
        a[2] + (b[2] - a[2]) * smooth,
      );
      if (tween.elapsed >= (tween.points.length - 1) * tween.step) motion.current = null;
    } else {
      const [x, y, z] = resting.current;
      group.current.position.set(x, y + pulse * 0.15, z);
    }
    group.current.scale.setScalar((stackCount > 1 ? 0.7 : 1) * (1 + pulse * 0.07));
    group.current.rotation.z = pulse * 0.08;
    ring.current?.scale.setScalar(1);
    if (motionEnabled && (move || motion.current)) invalidate();
  });
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (move) {
      event.stopPropagation();
      onSelectMove(move);
    }
  };
  const rim = shade(fill, -0.3);
  const gloss = shade(fill, 0.35);
  const glow = move ? fill : '#000000';
  return (
    <group ref={group} onClick={handleClick}>
      {/* A soft contact shadow sells the token as sitting on the board. */}
      <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {/* Darker base rim under a lit top: reads as a turned edge, not a flat disc. */}
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.47, 0.5, 0.1, 24]} />
        <meshStandardMaterial color={rim} roughness={0.7} />
      </mesh>
      {pieceStyle === 'coin' ? (
        <>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.44, 0.46, 0.16, 24]} />
            <meshStandardMaterial
              color={fill}
              roughness={0.45}
              metalness={0.2}
              emissive={glow}
              emissiveIntensity={move ? 0.35 : 0}
            />
          </mesh>
          <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.28, 0.045, 8, 28]} />
            <meshStandardMaterial color={gloss} roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.1, 12, 10]} />
            <meshStandardMaterial color={gloss} roughness={0.35} metalness={0.3} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.36, 0.44, 0.14, 24]} />
            <meshStandardMaterial color={fill} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <coneGeometry args={[0.27, 0.58, 24]} />
            <meshStandardMaterial
              color={fill}
              roughness={0.5}
              emissive={glow}
              emissiveIntensity={move ? 0.4 : 0}
            />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.25, 18, 14]} />
            <meshStandardMaterial color={fill} roughness={0.35} metalness={0.1} />
          </mesh>
          {/* Specular catch-light so the head reads as a sphere from above. */}
          <mesh position={[-0.08, 0.92, 0.1]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color={gloss} roughness={0.2} />
          </mesh>
        </>
      )}
      {move && (
        <>
          <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.47, 0.59, 32]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.68, 12, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  );
}

export function AnimatedBoardRotation({
  rotation,
  motionEnabled,
  children,
}: {
  rotation: number;
  motionEnabled: boolean;
  children: React.ReactNode;
}) {
  const group = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    if (!motionEnabled && group.current) group.current.rotation.y = rotation;
    invalidate();
  }, [rotation, motionEnabled, invalidate]);
  useFrame((_, delta) => {
    if (!group.current) return;
    const remaining = rotation - group.current.rotation.y;
    group.current.rotation.y =
      Math.abs(remaining) < 0.001 || !motionEnabled
        ? rotation
        : group.current.rotation.y + remaining * (1 - Math.exp(-10 * delta));
    if (Math.abs(remaining) >= 0.001 && motionEnabled) invalidate();
  });
  return <group ref={group}>{children}</group>;
}
