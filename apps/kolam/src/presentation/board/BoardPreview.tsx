import { useMemo } from 'react';
import type { Level } from '@/domain/entities/Board';
import type { LookInk } from '@/domain/entities/Look';
import { solve } from '@/application/engine/solver';
import type { Palette } from '../theme/palette';
import { fitBoard } from './geometry';
import { KolamBoard } from './KolamBoard';

const answers = new Map<string, Uint8Array | null>();

function answerOf(level: Level): Uint8Array | null {
  if (!answers.has(level.id)) answers.set(level.id, solve(level.puzzle));
  return answers.get(level.id) ?? null;
}

interface BoardPreviewProps {
  readonly level: Level;
  readonly width: number;
  readonly height: number;
  readonly ink: LookInk;
  readonly palette: Palette;
  /** Draws itself in on first show (the home screen); otherwise appears finished. */
  readonly animate: boolean;
}

/** A finished kolam, for the home screen and theme previews. Takes no touches. */
export function BoardPreview({ level, width, height, ink, palette, animate }: BoardPreviewProps) {
  const marks = answerOf(level);
  const geom = useMemo(
    () => fitBoard(level.puzzle.rows, level.puzzle.cols, width, height, 64),
    [level, width, height],
  );
  if (!marks) return null;
  return (
    <KolamBoard
      puzzle={level.puzzle}
      marks={marks}
      geom={geom}
      ink={ink}
      palette={palette}
      showErrors={false}
      autoCross={false}
      calm={!animate}
      won
      instant={!animate}
      zoomable={false}
      interactive={false}
    />
  );
}
