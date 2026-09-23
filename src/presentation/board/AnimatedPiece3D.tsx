import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import type { Move, Piece } from '@/domain';
import { cellToPosition3D } from './cellToPosition3D';
import { getCellForPiece } from './getCellForPiece';
import { getPieceWaypoints, PIECE_STEP_MS } from './pieceMotion';

type Point = readonly [number, number, number];
export function AnimatedPiece3D({
  piece,
  yardSlot,
  stackIndex,
  fill,
  move,
  motionEnabled,
  onSelectMove,
}: {
  piece: Piece;
  yardSlot: number;
  stackIndex: number;
  fill: string;
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
    const offset = stackIndex * 0.18;
    const toPoint = ([row, col]: readonly [number, number]): Point => {
      const [x, , z] = cellToPosition3D(row, col);
      return [x + offset, 0.2 + stackIndex * 0.12, z - offset];
    };
    resting.current = toPoint(getCellForPiece({ id, color, progress }, yardSlot));
    if (
      group.current &&
      motionEnabled &&
      previous.current !== null &&
      previous.current !== progress
    ) {
      const cells = getPieceWaypoints({ id, color, progress }, previous.current, yardSlot);
      motion.current = {
        points: [
          [group.current.position.x, group.current.position.y, group.current.position.z],
          ...cells.map(toPoint),
        ],
        elapsed: 0,
        step: cells.length === 1 ? 0.24 : PIECE_STEP_MS / 1000,
      };
    } else {
      motion.current = null;
      group.current?.position.set(...resting.current);
    }
    previous.current = progress;
    invalidate();
  }, [id, color, progress, yardSlot, stackIndex, motionEnabled, invalidate]);
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
    group.current.scale.setScalar(1 + pulse * 0.07);
    ring.current?.scale.setScalar(1 + pulse * 0.25);
    if (motionEnabled && (move || motion.current)) invalidate();
  });
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (move) {
      event.stopPropagation();
      onSelectMove(move);
    }
  };
  return (
    <group ref={group} onClick={handleClick}>
      <mesh>
        <cylinderGeometry args={[0.38, 0.45, 0.2, 20]} />
        <meshStandardMaterial color={fill} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <coneGeometry args={[0.3, 0.6, 20]} />
        <meshStandardMaterial
          color={fill}
          emissive={move ? fill : '#000000'}
          emissiveIntensity={move ? 0.5 : 0}
        />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color={fill} />
      </mesh>
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
