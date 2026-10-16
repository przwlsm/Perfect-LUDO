import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  createPicture,
  Group,
  PaintStyle,
  Picture,
  RoundedRect,
  Skia,
  type CanvasRef,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { withAlpha } from 'app-kit';
import {
  colourOf,
  pieceOf,
  WHITE,
  type Level,
  type Piece,
  type PieceKind,
} from '@/domain/entities/Board';
import type { Evaluation, PlayState } from '@/application/game/play';
import { lightColour, type BoardLook } from '../theme/festivals';
import { FONTS } from '../theme/palette';
import { Beams, LampLight, piecePicture, PieceSprite, SourceFlame, WinFx } from './BoardArt';
import { cellAt, cellCentre, slotAt, type BoardLayout } from './layout';
import { drawFlameBase, drawFrame, drawLampBody, drawOneway, drawWall } from './paint';

export interface BoardHandlers {
  onTapCell(at: number): void;
  onTapSlot(kind: PieceKind): void;
  /** A tray piece dropped on a cell. */
  onDropNew(kind: PieceKind, at: number): void;
  /** A placed piece dropped on a cell, or off the board (-1) to go back to the tray. */
  onDropMove(from: number, at: number): void;
}

interface GameBoardProps extends BoardHandlers {
  readonly level: Level;
  readonly state: PlayState;
  readonly evaluation: Evaluation;
  readonly layout: BoardLayout;
  readonly look: BoardLook;
  readonly scheme: 'night' | 'dusk';
  readonly colourAid: boolean;
  readonly calm: boolean;
  readonly selected: PieceKind | null;
  readonly trayLeft: ReadonlyMap<PieceKind, number>;
  readonly won: boolean;
  /** Labels for screen readers, one per cell. */
  readonly cellLabel: (at: number) => string;
}

type Drag =
  | { readonly from: 'tray'; readonly kind: PieceKind; readonly piece: Piece }
  | { readonly from: 'board'; readonly at: number; readonly piece: Piece };

/**
 * The play area: the board (frame, floor, light, pieces, lamps) and the
 * tray beneath it, drawn in one Skia canvas so a piece can be dragged
 * from one to the other. Taps and drags are read from one gesture; a grid
 * of invisible views carries labels for screen readers.
 */
export const GameBoard = forwardRef<CanvasRef, GameBoardProps>(function GameBoard(props, ref) {
  const {
    level,
    state,
    evaluation,
    layout,
    look,
    scheme,
    colourAid,
    calm,
    selected,
    trayLeft,
    won,
  } = props;
  const { t } = useTranslation();
  const c = layout.cell;
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    if (!calm) clock.set(frame.timeSinceFirstFrame / 1000);
  });

  // ---- static pictures
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
  const props_ = useMemo(
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

  // ---- the tray
  const trayPictures = useMemo(() => {
    const map = new Map<PieceKind, ReturnType<typeof piecePicture>>();
    for (const s of layout.slots)
      map.set(s.kind, piecePicture(pieceOf(s.kind), c * 0.9, look, 'free', colourAid));
    return map;
  }, [layout.slots, c, look, colourAid]);
  const shelf = useMemo(() => {
    if (layout.slots.length === 0) return null;
    return createPicture((canvas) => {
      const p = Skia.Paint();
      p.setAntiAlias(true);
      const w = Math.min(layout.width - 24, layout.slots.length * (layout.traySlot + 12) + 28);
      const x = (layout.width - w) / 2;
      const y = layout.trayY - layout.traySlot / 2 - 8;
      const h = layout.traySlot + 16;
      p.setColor(Skia.Color(withAlpha(look.night[1], scheme === 'night' ? 0.75 : 0.92)));
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), h / 2, h / 2), p);
      p.setColor(Skia.Color(withAlpha(look.metal[0], 0.35)));
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(1);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), h / 2, h / 2), p);
      p.setStyle(PaintStyle.Fill);
      for (const s of layout.slots) {
        p.setColor(Skia.Color(look.tile));
        const r = layout.traySlot / 2;
        canvas.drawRRect(
          Skia.RRectXY(Skia.XYWHRect(s.x - r, s.y - r, r * 2, r * 2), r * 0.4, r * 0.4),
          p,
        );
      }
    });
  }, [layout, look, scheme]);

  // ---- dragging
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const gx = useSharedValue(0);
  const gy = useSharedValue(0);
  const target = useSharedValue(-1);
  const ghostPicture = useMemo(
    () => (drag ? piecePicture(drag.piece, c, look, 'free', colourAid) : null),
    [drag, c, look, colourAid],
  );
  const ghostAngle = drag?.piece.type === 'mirror' && drag.piece.slant === 1 ? Math.PI / 2 : 0;
  const ghostTransform = useDerivedValue(() => [
    { translateX: gx.get() },
    { translateY: gy.get() - c * 0.55 },
    { rotate: ghostAngle },
    { scale: 1.15 },
  ]);
  const targetX = useDerivedValue(() => layout.bx + (target.get() % level.w) * c);
  const targetY = useDerivedValue(() => layout.by + Math.floor(target.get() / level.w) * c);
  const targetOpacity = useDerivedValue(() => (target.get() >= 0 ? 1 : 0));

  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  const gesture = useMemo(() => {
    const free = (at: number) => {
      const p = latest.current;
      return (
        at >= 0 &&
        !p.level.tiles[at] &&
        (!p.state.placed[at] || (dragRef.current?.from === 'board' && dragRef.current.at === at))
      );
    };
    const pickUp = (x: number, y: number): Drag | null => {
      const p = latest.current;
      const at = cellAt(p.layout, p.level, x, y);
      if (at >= 0) {
        const placed = p.state.placed[at];
        if (placed && !placed.hinted) return { from: 'board', at, piece: placed.piece };
        return null;
      }
      const slot = slotAt(p.layout, x, y);
      if (slot && (p.trayLeft.get(slot.kind) ?? 0) > 0) {
        return { from: 'tray', kind: slot.kind, piece: pieceOf(slot.kind) };
      }
      return null;
    };
    // The builder only stores these callbacks; gesture events call them later.
    const pan = Gesture.Pan()
      .minDistance(6)
      .maxPointers(1)
      .runOnJS(true)
      .onStart((e) => {
        const d = pickUp(e.x - e.translationX, e.y - e.translationY);
        dragRef.current = d;
        setDrag(d);
        gx.set(e.x);
        gy.set(e.y);
      })
      .onUpdate((e) => {
        if (!dragRef.current) return;
        gx.set(e.x);
        gy.set(e.y);
        const p = latest.current;
        const at = cellAt(p.layout, p.level, e.x, e.y - p.layout.cell * 0.55);
        target.set(free(at) ? at : -1);
      })
      .onEnd((e) => {
        const d = dragRef.current;
        if (!d) return;
        const p = latest.current;
        const at = cellAt(p.layout, p.level, e.x, e.y - p.layout.cell * 0.55);
        if (d.from === 'tray') {
          if (free(at)) p.onDropNew(d.kind, at);
        } else if (at === -1 || free(at)) {
          p.onDropMove(d.at, at);
        }
      })
      .onFinalize(() => {
        dragRef.current = null;
        setDrag(null);
        target.set(-1);
      });
    const tap = Gesture.Tap()
      .maxDistance(10)
      .runOnJS(true)
      .onEnd((e) => {
        const p = latest.current;
        const at = cellAt(p.layout, p.level, e.x, e.y);
        if (at >= 0) return p.onTapCell(at);
        const slot = slotAt(p.layout, e.x, e.y);
        if (slot) p.onTapSlot(slot.kind);
      });
    return Gesture.Exclusive(pan, tap);
  }, [gx, gy, target]);

  // ---- lamps and their order for the finale
  const lamps = useMemo(() => {
    const list: { at: number; x: number; y: number; need: number; sleeper: boolean }[] = [];
    level.tiles.forEach((tile, at) => {
      if (tile?.kind !== 'diya' && tile?.kind !== 'sleeper') return;
      const { x, y } = cellCentre(layout, level, at);
      list.push({
        at,
        x,
        y,
        need: tile.kind === 'diya' ? tile.need : 0,
        sleeper: tile.kind === 'sleeper',
      });
    });
    return list;
  }, [level, layout]);
  const flames = useMemo(() => {
    const list: { at: number; x: number; y: number; hue: number }[] = [];
    level.tiles.forEach((tile, at) => {
      if (tile?.kind !== 'flame') return;
      const { x, y } = cellCentre(layout, level, at);
      list.push({ at, x, y, hue: tile.hue });
    });
    return list;
  }, [level, layout]);
  const win = useSharedValue(-1);
  useEffect(() => {
    if (won) {
      win.set(0);
      win.set(withTiming(8, { duration: 8000, easing: Easing.linear }));
    } else win.set(-1);
  }, [won, win]);
  const finaleLamps = useMemo(
    () =>
      lamps
        .filter((l) => !l.sleeper)
        .map((l) => ({ x: l.x, y: l.y, colour: lightColour(l.need, look) })),
    [lamps, look],
  );
  const box = useMemo(
    () => ({
      x: layout.bx - layout.pad,
      y: layout.by - layout.pad,
      w: layout.bw + layout.pad * 2,
      h: layout.bh + layout.pad * 2,
    }),
    [layout],
  );

  // ---- pieces on the board
  const boardPieces = useMemo(() => {
    const list: {
      at: number;
      piece: Piece;
      mode: 'free' | 'fixed' | 'pivot' | 'hinted';
      appear: boolean;
    }[] = [];
    level.tiles.forEach((tile, at) => {
      if (tile?.kind !== 'piece') return;
      const piece: Piece =
        tile.lock === 'pivot' ? { type: 'mirror', slant: state.pivots[at] ?? 0 } : tile.piece;
      const hinted = state.hintedPivots.includes(at);
      list.push({ at, piece, mode: hinted ? 'hinted' : tile.lock, appear: false });
    });
    for (const [key, p] of Object.entries(state.placed)) {
      list.push({
        at: Number(key),
        piece: p.piece,
        mode: p.hinted ? 'hinted' : 'free',
        appear: true,
      });
    }
    return list;
  }, [level, state]);

  const selectRing = useSharedValue(0);
  useEffect(() => {
    selectRing.set(withSpring(selected ? 1 : 0));
  }, [selected, selectRing]);
  const selectedSlot = layout.slots.find((s) => s.kind === selected);

  return (
    <View style={{ width: layout.width, height: layout.height }}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          <Canvas ref={ref} style={StyleSheet.absoluteFill}>
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
              {boardPieces.map((p) => (
                <PieceSprite
                  // A placed piece that moves is a new sprite (it settles in again); a turn keeps it.
                  key={`${p.at}:${p.piece.type}${p.mode}`}
                  piece={p.piece}
                  mode={p.mode}
                  x={cellCentre(layout, level, p.at).x}
                  y={cellCentre(layout, level, p.at).y}
                  c={c}
                  look={look}
                  colourAid={colourAid}
                  appear={p.appear && !calm}
                  opacity={drag?.from === 'board' && drag.at === p.at ? 0.25 : 1}
                />
              ))}
              <Picture picture={props_} />
              {lamps.map((l, i) => {
                const state_ = l.sleeper
                  ? evaluation.lamps.get(l.at) === 'wrong'
                    ? 'wrong'
                    : 'dark'
                  : (evaluation.lamps.get(l.at) ?? 'dark');
                const got = evaluation.trace.lamp[l.at] ?? 0;
                return (
                  <LampLight
                    key={l.at}
                    x={l.x}
                    y={l.y}
                    c={c}
                    style={look.lamp}
                    want={l.sleeper ? '#9aa3c6' : lightColour(l.need, look)}
                    got={
                      colourOf(got) ? lightColour(got, look) : got & WHITE ? look.white : '#ffffff'
                    }
                    state={state_}
                    sleeper={l.sleeper}
                    clock={clock}
                    win={win}
                    order={i}
                    calm={calm}
                    warm={l.need === WHITE}
                  />
                );
              })}
              {flames.map((f) => (
                <SourceFlame
                  key={f.at}
                  x={f.x}
                  y={f.y}
                  c={c}
                  colour={lightColour(f.hue, look)}
                  clock={clock}
                  calm={calm}
                />
              ))}
            </Group>
            {shelf && <Picture picture={shelf} />}
            {selectedSlot && (
              <Circle
                cx={selectedSlot.x}
                cy={selectedSlot.y}
                r={layout.traySlot / 2 + 4}
                style="stroke"
                strokeWidth={2.5}
                color="#ffd36b"
                opacity={selectRing}
              >
                <BlurMask blur={2} style="solid" />
              </Circle>
            )}
            {layout.slots.map((s) => {
              const pic = trayPictures.get(s.kind);
              const left = trayLeft.get(s.kind) ?? 0;
              return pic ? (
                <Group
                  key={s.kind}
                  transform={[{ translateX: s.x }, { translateY: s.y }]}
                  opacity={left > 0 ? 1 : 0.28}
                >
                  <Picture picture={pic} />
                </Group>
              ) : null;
            })}
            <RoundedRect
              x={targetX}
              y={targetY}
              width={c}
              height={c}
              r={c * 0.2}
              style="stroke"
              strokeWidth={2.5}
              color="#ffd36b"
              opacity={targetOpacity}
            >
              <BlurMask blur={3} style="solid" />
            </RoundedRect>
            {ghostPicture && (
              <Group transform={ghostTransform} opacity={0.96}>
                <Picture picture={ghostPicture} />
              </Group>
            )}
            <WinFx win={win} lamps={finaleLamps} box={box} c={c} sparks={look.sparks} calm={calm} />
          </Canvas>
          {layout.slots.map((s) => {
            const left = trayLeft.get(s.kind) ?? 0;
            return (
              <View
                key={s.kind}
                pointerEvents="none"
                style={[
                  styles.count,
                  {
                    left: s.x + layout.traySlot / 2 - 18,
                    top: s.y - layout.traySlot / 2 - 8,
                    backgroundColor: left > 0 ? '#ffd36b' : withAlpha('#ffffff', 0.25),
                  },
                ]}
              >
                <Text style={styles.countText} allowFontScaling={false}>
                  {left}
                </Text>
              </View>
            );
          })}
          {/* For screen readers: one labelled, tappable view per cell and tray slot. */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {level.tiles.map((_, at) => {
              const { x, y } = cellCentre(layout, level, at);
              return (
                <View
                  key={at}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={props.cellLabel(at)}
                  onAccessibilityTap={() => props.onTapCell(at)}
                  accessibilityActions={[{ name: 'activate' }]}
                  onAccessibilityAction={() => props.onTapCell(at)}
                  style={[styles.cell, { left: x - c / 2, top: y - c / 2, width: c, height: c }]}
                />
              );
            })}
            {layout.slots.map((s) => (
              <View
                key={s.kind}
                accessible
                accessibilityRole="button"
                accessibilityLabel={t('game.trayA11y', {
                  piece: t(`game.pieces.${s.kind}`),
                  count: trayLeft.get(s.kind) ?? 0,
                })}
                accessibilityState={{
                  selected: selected === s.kind,
                  disabled: (trayLeft.get(s.kind) ?? 0) === 0,
                }}
                onAccessibilityTap={() => props.onTapSlot(s.kind)}
                accessibilityActions={[{ name: 'activate' }]}
                onAccessibilityAction={() => props.onTapSlot(s.kind)}
                style={[
                  styles.cell,
                  {
                    left: s.x - layout.traySlot / 2,
                    top: s.y - layout.traySlot / 2,
                    width: layout.traySlot,
                    height: layout.traySlot,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  cell: { position: 'absolute' },
  count: {
    position: 'absolute',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: FONTS.bodyHeavy, fontSize: 12.5, color: '#2b1500' },
});
