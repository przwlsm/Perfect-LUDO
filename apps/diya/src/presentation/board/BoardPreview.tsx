import { useMemo } from 'react';
import { Canvas, createPicture, Group, Picture, Skia } from '@shopify/react-native-skia';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { colourOf, WHITE, type Level, type Placement } from '@/domain/entities/Board';
import { arrangementOf } from '@/application/engine/grid';
import { evaluate, startState, type PlayState } from '@/application/game/play';
import { lightColour, type BoardLook } from '../theme/festivals';
import { Beams, LampLight, PieceSprite, SourceFlame } from './BoardArt';
import { cellCentre, layoutBoard } from './layout';
import { drawFlameBase, drawFrame, drawLampBody, drawOneway, drawWall } from './paint';

interface BoardPreviewProps {
  readonly level: Level;
  /** Pieces to show placed (and pivots turned); the level's own answer by default. */
  readonly placements?: readonly Placement[];
  readonly width: number;
  readonly height: number;
  readonly look: BoardLook;
  readonly scheme: 'night' | 'dusk';
  readonly calm: boolean;
  readonly colourAid?: boolean;
}

/** A small, still-living board: light, lamps and flames, no tray and no touch. */
export function BoardPreview({
  level,
  placements,
  width,
  height,
  look,
  scheme,
  calm,
  colourAid = false,
}: BoardPreviewProps) {
  const bare = useMemo<Level>(() => ({ ...level, tray: [] }), [level]);
  // A little room around the frame, so its glow is not cut off by the canvas edge.
  const layout = useMemo(() => {
    const l = layoutBoard(bare, width - 24, height - 16);
    return { ...l, bx: l.bx + 12, by: l.by + 8 };
  }, [bare, width, height]);
  const c = layout.cell;
  const state = useMemo<PlayState>(() => {
    const a = arrangementOf(level, placements ?? level.solution);
    const placed = Object.fromEntries(
      Object.entries(a.placed).map(([at, piece]) => [at, { piece, hinted: false }]),
    );
    return { ...startState(level), placed, pivots: { ...startState(level).pivots, ...a.pivots } };
  }, [level, placements]);
  const evaluation = useMemo(() => evaluate(level, state), [level, state]);
  const clock = useSharedValue(0);
  const win = useSharedValue(-1);
  useFrameCallback((frame) => {
    if (!calm) clock.set(frame.timeSinceFirstFrame / 1000);
  });

  const frameClip = useMemo(
    () =>
      Skia.RRectXY(
        Skia.XYWHRect(
          layout.bx - layout.pad + 1,
          layout.by - layout.pad + 1,
          layout.bw + layout.pad * 2 - 2,
          layout.bh + layout.pad * 2 - 2,
        ),
        layout.pad + c * 0.2,
        layout.pad + c * 0.2,
      ),
    [layout, c],
  );
  const floor = useMemo(
    () =>
      createPicture((canvas) => {
        drawFrame(canvas, layout, level.w, level.h, look, scheme);
        level.tiles.forEach((tile, at) => {
          const { x, y } = cellCentre(layout, level, at);
          if (tile?.kind === 'wall') drawWall(canvas, x, y, c, look);
          if (tile?.kind === 'oneway') drawOneway(canvas, x, y, c, tile.dir);
        });
      }),
    [layout, level, look, scheme, c],
  );
  const bodies = useMemo(
    () =>
      createPicture((canvas) => {
        level.tiles.forEach((tile, at) => {
          const { x, y } = cellCentre(layout, level, at);
          if (tile?.kind === 'diya')
            drawLampBody(canvas, look.lamp, tile.need, x, y, c, look, colourAid, false);
          if (tile?.kind === 'sleeper')
            drawLampBody(canvas, look.lamp, WHITE, x, y, c, look, false, true);
          if (tile?.kind === 'flame') drawFlameBase(canvas, x, y, c, tile.dir, look);
        });
      }),
    [layout, level, look, colourAid, c],
  );

  const pieces = useMemo(() => {
    const list: {
      at: number;
      piece: NonNullable<Level['solution'][number]>['piece'];
      mode: 'free' | 'fixed' | 'pivot';
    }[] = [];
    level.tiles.forEach((tile, at) => {
      if (tile?.kind !== 'piece') return;
      list.push({
        at,
        piece:
          tile.lock === 'pivot' ? { type: 'mirror', slant: state.pivots[at] ?? 0 } : tile.piece,
        mode: tile.lock,
      });
    });
    for (const [at, p] of Object.entries(state.placed))
      list.push({ at: Number(at), piece: p.piece, mode: 'free' });
    return list;
  }, [level, state]);

  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Picture picture={floor} />
      <Group clip={frameClip}>
        <Beams
          segs={evaluation.trace.segs}
          bx={layout.bx}
          by={layout.by}
          c={c}
          look={look}
          clock={clock}
          calm={calm}
          colourAid={colourAid}
        />
        {pieces.map((p) => {
          const { x, y } = cellCentre(layout, level, p.at);
          return (
            <PieceSprite
              key={p.at}
              piece={p.piece}
              mode={p.mode}
              x={x}
              y={y}
              c={c}
              look={look}
              colourAid={colourAid}
            />
          );
        })}
        <Picture picture={bodies} />
        {level.tiles.map((tile, at) => {
          if (tile?.kind !== 'diya') return null;
          const { x, y } = cellCentre(layout, level, at);
          const s = evaluation.lamps.get(at) ?? 'dark';
          const got = evaluation.trace.lamp[at] ?? 0;
          return (
            <LampLight
              key={at}
              x={x}
              y={y}
              c={c}
              style={look.lamp}
              want={lightColour(tile.need, look)}
              got={colourOf(got) ? lightColour(got, look) : '#ffffff'}
              state={s}
              sleeper={false}
              clock={clock}
              win={win}
              order={0}
              calm={calm}
              warm={tile.need === WHITE}
            />
          );
        })}
        {level.tiles.map((tile, at) => {
          if (tile?.kind !== 'flame') return null;
          const { x, y } = cellCentre(layout, level, at);
          return (
            <SourceFlame
              key={at}
              x={x}
              y={y}
              c={c}
              colour={lightColour(tile.hue, look)}
              clock={clock}
              calm={calm}
            />
          );
        })}
      </Group>
    </Canvas>
  );
}
