import { useMemo } from 'react';
import type { Level } from '@/domain/entities/Board';
import { flow } from '@/application/engine/flow';
import type { BoardLook } from '../theme/looks';
import { BoardView } from './BoardView';
import { layoutBoard } from './layout';

interface BoardPreviewProps {
  readonly level: Level;
  /** Rotations to show; the level's answer by default. */
  readonly rot?: readonly number[];
  readonly width: number;
  readonly height: number;
  readonly look: BoardLook;
  readonly scheme: 'dusk' | 'morning';
  readonly calm: boolean;
  readonly colourAid?: boolean;
  readonly rain?: boolean;
}

/** A small, living board with no touch: water running, rain falling. */
export function BoardPreview({
  level,
  rot,
  width,
  height,
  look,
  scheme,
  calm,
  colourAid = false,
  rain = true,
}: BoardPreviewProps) {
  const rotation = useMemo(() => rot ?? level.tiles.map(() => 0), [rot, level]);
  const evaluation = useMemo(() => flow(level, rotation), [level, rotation]);
  const layout = useMemo(() => layoutBoard(level, width, height, 64), [level, width, height]);
  const hinted = useMemo(() => [] as number[], []);
  return (
    <BoardView
      level={level}
      rot={rotation}
      hinted={hinted}
      flow={evaluation}
      layout={layout}
      look={look}
      scheme={scheme}
      calm={calm}
      colourAid={colourAid}
      rain={rain}
    />
  );
}
