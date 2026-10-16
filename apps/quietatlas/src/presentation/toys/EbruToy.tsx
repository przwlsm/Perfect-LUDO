import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  Canvas,
  Circle,
  createPicture,
  Fill,
  FractalNoise,
  Image as SkiaImage,
  PaintStyle,
  Picture,
  RadialGradient,
  Skia,
  useCanvasRef,
  vec,
  type SkImage,
  type SkPicture,
} from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, SlideInUp, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { random } from '@/application/random';
import { Tray, type InkDrop } from '@/application/marbling/Tray';
import { toyById } from '@/domain/entities/Toy';
import { AppText, Button, IconButton, Pressy, Sheet } from '../components/Kit';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { ColorBar, LookBar, useLook } from './Looks';
import { useChrome } from './ToyChrome';
import { ToyShell } from './ToyShell';
import { useSharePicture } from './useSharePicture';
import { useToyGesture } from './useToyGesture';

const TOY = toyById('ebru')!;
/** A tap's drop, and the most a held drop spreads to. */
const DROP_START = 18;
const DROP_MAX = 92;
/** Radius gained per second while the finger stays down. */
const DROP_GROWTH = 52;
/** Ms a finger must stay still before it counts as a drop rather than a needle. */
const DROP_DELAY = 110;
const MOVE_SLOP = 9;
const UNDO_DEPTH = 12;

type Tool = 'needle' | 'comb';

/**
 * Ebru: inks float on the tray as polygons (see application/marbling/Tray).
 * Holding a finger still drops ink that keeps spreading while held; moving
 * draws a needle, or a five-tine comb, through it. Finished? Lay paper on the
 * water and lift the print.
 */
export function EbruToy() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { haptics, sounds, calmMotion } = useSettings();
  const { look, choose } = useLook('ebru');
  const chrome = useChrome();
  const canvas = useCanvasRef();
  const share = useSharePicture(canvas, 'ebru');

  const trayRef = useRef<Tray | null>(null);
  const getTray = () => (trayRef.current ??= new Tray(width, height));
  const [view, setView] = useState<{ picture: SkPicture | null; empty: boolean; canUndo: boolean }>(
    {
      picture: null,
      empty: true,
      canUndo: false,
    },
  );
  const [colorIndex, setColorIndex] = useState(0);
  const [tool, setTool] = useState<Tool>('needle');
  const [print, setPrint] = useState<SkImage | null>(null);
  const undo = useRef<InkDrop[][]>([]);
  const touch = useRef<{
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    mode: 'pending' | 'drop' | 'needle';
    dropId: number;
    radius: number;
    timer: ReturnType<typeof setTimeout> | null;
    raf: number | null;
    grownAt: number;
  } | null>(null);
  const color = look.colors[colorIndex % look.colors.length]!;
  /** Repaints the ink. Built here, in the event, so rendering stays cheap. */
  const refresh = () => {
    const tray = getTray();
    setView({
      picture: paintTray(tray, width, height),
      empty: tray.drops.length === 0,
      canUndo: undo.current.length > 0,
    });
  };

  const remember = () => {
    undo.current.push(getTray().snapshot());
    if (undo.current.length > UNDO_DEPTH) undo.current.shift();
  };

  const startDrop = () => {
    const s = touch.current;
    if (!s || s.mode !== 'pending') return;
    remember();
    s.mode = 'drop';
    s.radius = DROP_START;
    s.dropId = getTray().drop(s.x, s.y, DROP_START, color);
    s.grownAt = Date.now();
    haptics.tap();
    sounds.play('ink');
    refresh();
    const grow = () => {
      const cur = touch.current;
      if (!cur || cur.mode !== 'drop') return;
      const now = Date.now();
      const next = Math.min(DROP_MAX, cur.radius + (DROP_GROWTH * (now - cur.grownAt)) / 1000);
      cur.grownAt = now;
      if (next > cur.radius) {
        getTray().grow(cur.dropId, cur.x, cur.y, cur.radius, next);
        cur.radius = next;
        refresh();
      }
      if (next < DROP_MAX) cur.raf = requestAnimationFrame(grow);
    };
    s.raf = requestAnimationFrame(grow);
  };

  const begin = (x: number, y: number) => {
    chrome.touching(true);
    touch.current = {
      x,
      y,
      lastX: x,
      lastY: y,
      mode: 'pending',
      dropId: 0,
      radius: 0,
      timer: setTimeout(startDrop, DROP_DELAY),
      raf: null,
      grownAt: 0,
    };
  };
  const move = (x: number, y: number) => {
    const s = touch.current;
    if (!s) return;
    if (s.mode === 'pending' && Math.hypot(x - s.x, y - s.y) > MOVE_SLOP) {
      if (s.timer) clearTimeout(s.timer);
      s.mode = 'needle';
      remember();
      haptics.tick();
      sounds.play('swish');
    }
    if (s.mode !== 'needle') return;
    if (Math.hypot(x - s.lastX, y - s.lastY) < 1.5) return;
    if (tool === 'comb') getTray().comb(s.lastX, s.lastY, x, y, 5, 26);
    else getTray().needle(s.lastX, s.lastY, x, y);
    s.lastX = x;
    s.lastY = y;
    refresh();
  };
  const end = () => {
    chrome.touching(false);
    const s = touch.current;
    if (!s) return;
    if (s.timer) clearTimeout(s.timer);
    if (s.raf !== null) cancelAnimationFrame(s.raf);
    // A quick tap still drops ink, just a small drop.
    if (s.mode === 'pending') {
      s.mode = 'drop';
      remember();
      getTray().drop(s.x, s.y, DROP_START, color);
      haptics.tap();
      sounds.play('ink');
      refresh();
    }
    touch.current = null;
  };

  useEffect(
    () => () => {
      const s = touch.current;
      if (s?.timer) clearTimeout(s.timer);
      if (s?.raf != null) cancelAnimationFrame(s.raf);
    },
    [],
  );

  const gesture = useToyGesture({
    onBegin: (p) => begin(p.x, p.y),
    onMove: (p) => move(p.x, p.y),
    onEnd: end,
  });

  /** One tap to begin: a scatter of drops in every colour of the look. */
  const sprinkle = () => {
    remember();
    const r = random(Date.now() & 0xffff);
    for (let k = 0; k < 14; k++) {
      getTray().drop(
        width * (0.12 + r() * 0.76),
        height * (0.18 + r() * 0.6),
        14 + r() * 34,
        look.colors[k % look.colors.length]!,
      );
    }
    haptics.tap();
    sounds.play('ink');
    refresh();
  };

  const lift = async () => {
    haptics.thump();
    sounds.play('paper');
    const image = await canvas.current?.makeImageSnapshotAsync();
    if (image) setPrint(image);
  };

  const center = vec(width / 2, height / 2);
  const reach = Math.max(width, height) * 0.8;
  const empty = view.empty;

  return (
    <ToyShell
      toy={TOY}
      background={look.background}
      actions={
        <IconButton
          icon="print-outline"
          label={t('ebru.print')}
          disabled={empty}
          onPress={() => void lift()}
        />
      }
      tools={
        <>
          <View style={styles.row}>
            <IconButton
              icon="arrow-undo"
              label={t('toy.undo')}
              disabled={!view.canUndo}
              onPress={() => {
                const prev = undo.current.pop();
                if (prev) {
                  getTray().restore(prev);
                  refresh();
                }
              }}
            />
            <ColorBar colors={look.colors} index={colorIndex} onPick={setColorIndex} />
            <IconButton
              icon="trash-outline"
              label={t('toy.clear')}
              disabled={empty}
              onPress={() => {
                remember();
                getTray().clear();
                sounds.play('swish');
                refresh();
              }}
            />
          </View>
          <View style={styles.row}>
            <Pressy
              onPress={sprinkle}
              accessibilityLabel={t('ebru.sprinkle')}
              style={[
                styles.pill,
                { backgroundColor: theme.glass, borderColor: theme.glassBorder },
              ]}
            >
              <AppText variant="heading">✦ {t('ebru.sprinkle')}</AppText>
            </Pressy>
            <ToolPill
              active={tool === 'needle'}
              label={t('ebru.needle')}
              onPress={() => setTool('needle')}
            />
            <ToolPill
              active={tool === 'comb'}
              label={t('ebru.comb')}
              onPress={() => setTool('comb')}
            />
          </View>
          <LookBar toy="ebru" current={look} onChoose={choose} />
        </>
      }
    >
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          <Canvas ref={canvas} style={StyleSheet.absoluteFill}>
            <Fill color={look.background} />
            {/* Thickened water: a soft sheen and the faint grain of the size. */}
            <Circle cx={center.x} cy={center.y} r={reach}>
              <RadialGradient
                c={center}
                r={reach}
                colors={[look.background, look.backgroundEdge]}
              />
            </Circle>
            <Fill opacity={0.05}>
              <FractalNoise freqX={0.6} freqY={0.6} octaves={2} />
            </Fill>
            {view.picture && <Picture picture={view.picture} />}
          </Canvas>
        </View>
      </GestureDetector>

      <Sheet visible={print !== null} onClose={() => setPrint(null)} title={t('ebru.printed')}>
        {print && (
          <Animated.View entering={calmMotion ? FadeIn : SlideInUp.springify().damping(16)}>
            <View
              style={[
                styles.paper,
                { aspectRatio: width / height, boxShadow: `0 12px 30px ${theme.shadow}` },
              ]}
            >
              <Animated.View
                entering={calmMotion ? undefined : ZoomIn.delay(150)}
                style={StyleSheet.absoluteFill}
              >
                <PaperPrint image={print} />
              </Animated.View>
            </View>
          </Animated.View>
        )}
        <View style={styles.row}>
          <Button
            kind="secondary"
            icon="refresh"
            label={t('ebru.again')}
            onPress={() => {
              remember();
              getTray().clear();
              refresh();
              setPrint(null);
            }}
          />
          <Button
            icon="share-outline"
            label={t('toy.share')}
            onPress={() => void share().catch(() => undefined)}
          />
        </View>
        <Button kind="ghost" label={t('ebru.keep')} onPress={() => setPrint(null)} />
      </Sheet>
    </ToyShell>
  );
}

function ToolPill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressy
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[
        styles.pill,
        { backgroundColor: active ? theme.accent : theme.glass, borderColor: theme.glassBorder },
      ]}
    >
      <AppText variant="heading" color={active ? theme.onAccent : theme.text}>
        {label}
      </AppText>
    </Pressy>
  );
}

/** The lifted print on cream paper, with the paper's own grain over it. */
function PaperPrint({ image }: { image: SkImage }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.w > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill color="#f6efe0" />
          <SkiaImage
            image={image}
            x={6}
            y={6}
            width={size.w - 12}
            height={size.h - 12}
            fit="cover"
            opacity={0.93}
          />
          <Fill opacity={0.08}>
            <FractalNoise freqX={1.2} freqY={1.2} octaves={3} />
          </Fill>
        </Canvas>
      )}
    </View>
  );
}

/** Every drop of ink, oldest first, each with a faint darker rim like real ebru. */
function paintTray(tray: Tray, width: number, height: number): SkPicture {
  return createPicture(
    (c) => {
      const fill = Skia.Paint();
      fill.setAntiAlias(true);
      const rim = Skia.Paint();
      rim.setAntiAlias(true);
      rim.setStyle(PaintStyle.Stroke);
      rim.setStrokeWidth(1);
      rim.setColor(Skia.Color('rgba(20, 10, 0, 0.18)'));
      for (const drop of tray.drops) {
        const path = Skia.Path.MakeFromSVGString(svgOf(drop.points));
        if (!path) continue;
        fill.setColor(Skia.Color(drop.color));
        c.drawPath(path, fill);
        c.drawPath(path, rim);
      }
    },
    { width, height },
  );
}

/** A closed polygon as SVG path data; one native call per drop instead of one per point. */
function svgOf(p: readonly number[]): string {
  if (p.length < 6) return '';
  const parts: string[] = [`M${p[0]!.toFixed(1)} ${p[1]!.toFixed(1)}`];
  for (let i = 2; i < p.length; i += 2) parts.push(`L${p[i]!.toFixed(1)} ${p[i + 1]!.toFixed(1)}`);
  parts.push('Z');
  return parts.join('');
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pill: {
    minHeight: 44,
    minWidth: 52,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paper: {
    alignSelf: 'center',
    width: '62%',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f6efe0',
    transform: [{ rotate: '-1.5deg' }],
  },
});
