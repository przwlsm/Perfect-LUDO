import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  createPicture,
  Picture,
  type CanvasRef,
  type SkPicture,
} from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { random } from 'app-kit';
import { baseMask, DX, DY, type Level, type Tile } from '@/domain/entities/Board';
import type { Flow } from '@/application/engine/flow';
import { groundOf, waterColour, type BoardLook } from '../theme/looks';
import { cellCentre, type BoardLayout } from './layout';
import {
  arms,
  channelPicture,
  drawGround,
  fieldPictures,
  springPicture,
  topPicture,
  type FieldPictures,
} from './paint';
import {
  D,
  DYN,
  drawScene,
  FILL_MS,
  springAt,
  STEP_MS,
  type Leak,
  type SceneInput,
  type StaticTile,
} from './scene';

/** When water reaches things after a change, so sounds can land with it. */
export interface Timeline {
  /** Fields that just turned green, and how long until the water gets there (ms). */
  readonly fields: readonly { readonly at: number; readonly delay: number }[];
  /** Spills that just started. */
  readonly newLeaks: number;
  /** Until the water stops moving (ms). */
  readonly settle: number;
}

export interface BoardViewProps {
  readonly level: Level;
  readonly rot: readonly number[];
  readonly hinted: readonly number[];
  readonly flow: Flow;
  readonly layout: BoardLayout;
  readonly look: BoardLook;
  readonly scheme: 'dusk' | 'morning';
  readonly calm: boolean;
  readonly colourAid: boolean;
  /** Rain falling over the board (off under calmer motion anyway). */
  readonly rain?: boolean;
  /** Play the finale (clouds part, rainbow) once the water has arrived. */
  readonly celebrate?: boolean;
  readonly onTimeline?: (t: Timeline) => void;
}

const HINT_GOLD = '#ffd65c';

/**
 * The board, drawn: a static hillside picture underneath and one picture
 * painted every frame on top (see scene.ts). It turns play state into the
 * few timestamps the scene needs.
 */
export const BoardView = forwardRef<CanvasRef, BoardViewProps>(function BoardView(props, ref) {
  const { level, rot, hinted, flow, layout, look, scheme, calm, colourAid } = props;
  const c = layout.cell;
  const ground = groundOf(look, scheme);

  const clock = useSharedValue(0);
  const idle = useSharedValue(0);
  useFrameCallback((frame) => {
    const dt = frame.timeSincePreviousFrame ?? 16;
    clock.set(clock.get() + dt);
    if (!calm) idle.set(idle.get() + dt);
  });

  const hillside = useMemo(
    () => createPicture((canvas) => drawGround(canvas, layout, level, look, ground)),
    [layout, level, look, ground],
  );

  // ---- what never changes while this board is on screen
  const { statics, index } = useMemo(() => {
    const channels = new Map<string, SkPicture | null>();
    const tops = new Map<string, SkPicture | null>();
    const springs = new Map<number, SkPicture>();
    const fields = new Map<number, FieldPictures>();
    const keyOf = (t: Tile) =>
      t.kind === 'rock' || t.kind === 'bridge'
        ? t.kind
        : `${t.kind}:${baseMask(t)}:${t.kind === 'dam' ? t.out : ''}`;
    const list: StaticTile[] = [];
    const index = new Int32Array(level.tiles.length).fill(-1);
    level.tiles.forEach((tile, at) => {
      if (tile.kind === 'rock') return;
      const key = keyOf(tile);
      if (!channels.has(key)) channels.set(key, channelPicture(tile, c, look));
      if (!tops.has(key)) tops.set(key, topPicture(tile, c, look));
      const { x, y } = cellCentre(layout, level, at);
      const mask = tile.kind === 'bridge' ? 0b0101 : baseMask(tile);
      const sides: number[] = [];
      for (let d = 0; d < 4; d++) if (mask & (1 << d)) sides.push(d);
      let spring: SkPicture | null = null;
      let field: FieldPictures | null = null;
      if (tile.kind === 'source') {
        if (!springs.has(tile.water)) springs.set(tile.water, springPicture(tile.water, c, look));
        spring = springs.get(tile.water)!;
      }
      if (tile.kind === 'field') {
        if (!fields.has(tile.water)) fields.set(tile.water, fieldPictures(tile.water, c, look));
        field = fields.get(tile.water)!;
      }
      index[at] = list.length;
      list.push({
        x,
        y,
        base: channels.get(key) ?? null,
        top: tops.get(key) ?? null,
        bridge: tile.kind === 'bridge',
        arms: arms(mask, c).flat(),
        sides,
        basin: tile.kind === 'pipe' && (mask & (mask - 1)) === 0,
        spring,
        drips: tile.kind === 'source' && tile.water === 0,
        field,
      });
    });
    return { statics: list, index };
  }, [level, layout, look, c]);

  const rainSeeds = useMemo(() => {
    const r = random(level.w * 131 + level.h);
    const count = Math.round(Math.min(80, 18 + level.w * level.h * 0.6));
    return Array.from({ length: count * 3 }, () => r());
  }, [level.w, level.h]);

  const fireflies = useMemo(() => {
    const r = random(level.w * 17 + level.h * 3);
    return Array.from({ length: Math.round(6 + level.w * level.h * 0.08) * 3 }, () => r());
  }, [level.w, level.h]);

  // ---- what changes with play: turns, water, fields, hints
  const memory = useRef<{
    level: Level | null;
    rot: number[];
    wet: Uint8Array;
    fields: Uint8Array;
    hinted: Set<number>;
    dyn: number[];
    leaks: Set<string>;
    winAt: number;
  } | null>(null);
  const scene = useSharedValue<SceneInput>({
    tiles: [],
    dyn: [],
    leaks: [],
    colours: {
      rain: '#5cb8ff',
      tank: '#ff86b4',
      mud: '#8a6e4b',
      rainfall: ground.rain,
      hint: HINT_GOLD,
      cloud: '#ffffff',
    },
    c,
    box: { x: layout.bx, y: layout.by, w: layout.bw, h: layout.bh },
    aid: colourAid,
    winAt: -1,
    rainSeeds: [],
    fireflies: [],
  });

  const latest = useRef(props.onTimeline);
  useEffect(() => {
    latest.current = props.onTimeline;
  });

  useEffect(() => {
    const now = clock.get();
    const n = level.tiles.length;
    let fresh = memory.current;
    if (!fresh || fresh.level !== level) {
      fresh = {
        level,
        rot: [...rot],
        wet: new Uint8Array(n * 2),
        fields: new Uint8Array(n),
        hinted: new Set(hinted),
        dyn: new Array<number>(statics.length * DYN).fill(0),
        leaks: new Set(),
        winAt: -1,
      };
      const init = fresh.dyn;
      level.tiles.forEach((_, a) => {
        const i = index[a]!;
        if (i < 0) return;
        const r = rot[a] ?? 0;
        init[i * DYN + D.turnFrom] = r;
        init[i * DYN + D.turnTo] = r;
        init[i * DYN + D.turnAt] = -1e6;
        init[i * DYN + D.in0] = -1;
        init[i * DYN + D.in1] = -1;
        init[i * DYN + D.since0] = -1e6;
        init[i * DYN + D.since1] = -1e6;
        init[i * DYN + D.hintAt] = -1e6;
      });
      memory.current = fresh;
    }
    const m = fresh;
    const dyn = m.dyn;
    // Water newly arriving travels outward in flow order.
    let first = Infinity;
    for (let p = 0; p < n * 2; p++)
      if (flow.wet[p] && !m.wet[p]) first = Math.min(first, flow.order[p]!);
    const delayOf = (p: number) => Math.max(0, (flow.order[p]! - first) * STEP_MS);
    const watered: { at: number; delay: number }[] = [];
    let settle = 0;
    level.tiles.forEach((tile, a) => {
      const i = index[a]!;
      if (i < 0) return;
      const o = i * DYN;
      const r = rot[a] ?? 0;
      const was = m.rot[a] ?? 0;
      if (r !== was) {
        let delta = (((r - was) % 4) + 4) % 4;
        if (delta === 3) delta = -1;
        const current = springAt(
          dyn[o + D.turnFrom]!,
          dyn[o + D.turnTo]!,
          now - dyn[o + D.turnAt]!,
          calm,
        );
        dyn[o + D.turnFrom] = current;
        dyn[o + D.turnTo] = dyn[o + D.turnTo]! + delta;
        dyn[o + D.turnAt] = now;
      }
      for (const part of tile.kind === 'bridge' ? [0, 1] : [0]) {
        const p = a * 2 + part;
        const wet = flow.wet[p]!;
        const since = part === 0 ? D.since0 : D.since1;
        if (wet && !m.wet[p]) {
          dyn[o + since] = now + delayOf(p);
          settle = Math.max(settle, delayOf(p) + FILL_MS);
        } else if (!wet && m.wet[p]) dyn[o + since] = now;
        dyn[o + (part === 0 ? D.wet0 : D.wet1)] = wet;
        const entry = flow.entry[p]!;
        const unturned =
          entry < 0 ? -1 : (((entry - (tile.kind === 'bridge' ? 0 : r)) % 4) + 4) % 4;
        if (wet) dyn[o + (part === 0 ? D.in0 : D.in1)] = unturned;
      }
      if (tile.kind === 'field') {
        const state = flow.fields.get(a);
        const code = state === 'wet' ? 1 : state === 'wrong' ? 2 : 0;
        if (code === 1 && m.fields[a] !== 1) {
          const arrive = Math.max(0, dyn[o + D.since0]! - now);
          dyn[o + D.greenAt] = now + arrive + FILL_MS + 120;
          watered.push({ at: a, delay: arrive + FILL_MS });
        }
        m.fields[a] = code;
        dyn[o + D.field] = code;
      }
      const isHinted = hinted.includes(a);
      if (isHinted && !m.hinted.has(a)) dyn[o + D.hintAt] = now;
      dyn[o + D.hinted] = isHinted ? 1 : 0;
    });
    m.rot = [...rot];
    m.wet = Uint8Array.from(flow.wet);
    m.hinted = new Set(hinted);

    const leaks: Leak[] = [];
    const leakKeys = new Set<string>();
    let newLeaks = 0;
    for (const leak of flow.leaks) {
      const key = `${leak.at}:${leak.dir}`;
      leakKeys.add(key);
      if (!m.leaks.has(key)) newLeaks++;
      const { x, y } = cellCentre(layout, level, leak.at);
      leaks.push({
        x: x + DX[leak.dir]! * c * 0.5,
        y: y + DY[leak.dir]! * c * 0.5,
        dx: DX[leak.dir]!,
        dy: DY[leak.dir]!,
        colour: waterColour(look, leak.water),
      });
    }
    m.leaks = leakKeys;
    if (flow.solved && props.celebrate && m.winAt < 0) m.winAt = now + settle + 250;
    if (!flow.solved) m.winAt = -1;

    scene.set({
      tiles: statics,
      dyn: [...dyn],
      leaks,
      colours: {
        rain: look.rainWater,
        tank: look.tankWater,
        mud: look.mud,
        rainfall: ground.rain,
        hint: HINT_GOLD,
        cloud: scheme === 'dusk' || look.alwaysNight ? '#56707a' : '#f4f8fa',
      },
      c,
      box: { x: layout.bx, y: layout.by, w: layout.bw, h: layout.bh },
      aid: colourAid,
      winAt: m.winAt,
      rainSeeds: props.rain === false ? [] : rainSeeds,
      fireflies: look.flora === 'firefly' ? fireflies : [],
    });
    if (watered.length || newLeaks) latest.current?.({ fields: watered, newLeaks, settle });
  }, [
    level,
    rot,
    hinted,
    flow,
    statics,
    index,
    layout,
    look,
    ground,
    scheme,
    c,
    colourAid,
    calm,
    rainSeeds,
    fireflies,
    props.rain,
    props.celebrate,
    clock,
    scene,
  ]);

  const picture = useDerivedValue(() => {
    const s = scene.get();
    const t = clock.get();
    const i = idle.get();
    return createPicture((canvas) => drawScene(canvas, s, t, i, calm));
  });

  return (
    <View style={{ width: layout.width, height: layout.height }} pointerEvents="none">
      <Canvas ref={ref} style={StyleSheet.absoluteFill}>
        <Picture picture={hillside} />
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
});
