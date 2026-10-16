import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  BlurStyle,
  Canvas,
  Circle,
  createPicture,
  Group,
  LinearGradient,
  PaintStyle,
  Picture,
  Rect,
  Skia,
  TileMode,
  vec,
  type SkCanvas,
} from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { bubbleAt, makeSheet, type Bubble, type Sheet } from '@/application/bubbles/sheet';
import type { Look } from '@/domain/entities/Look';
import { toyById } from '@/domain/entities/Toy';
import { storage } from '@/config/container';
import { AppText, Button } from '../components/Kit';
import { useSettings } from '../state/SettingsProvider';
import { withAlpha } from '../theme/color';
import { useTheme } from '../theme/ThemeProvider';
import { LookBar, useLook } from './Looks';
import { useChrome } from './ToyChrome';
import { ToyShell } from './ToyShell';
import { useToyGesture } from './useToyGesture';

const TOY = toyById('bubbles')!;
const COUNT_KEY = 'quietatlas.bubbles.popped';
/** Room kept for the top bar and the tools. */
const TOP_ROOM = 72;
const BOTTOM_ROOM = 170;
const BURST_MS = 700;

interface Burst {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly golden: boolean;
  readonly at: number;
}

/**
 * Bubble wrap: tap a bubble, or sweep a finger across a row. Each pop has
 * its own pitch, a crisp haptic, and a little puff of air. Golden bubbles
 * hide in some sheets. When the sheet is done, a fresh one rolls in.
 */
export function BubblesToy() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { haptics, sounds, calmMotion } = useSettings();
  const { look, choose } = useLook('bubbles');
  const chrome = useChrome();

  const top = insets.top + TOP_ROOM;
  const sheetHeight = Math.max(240, height - top - BOTTOM_ROOM - insets.bottom);
  const sheetWidth = Math.min(width - 16, 620);
  const left = (width - sheetWidth) / 2;

  const [seed, setSeed] = useState(() => Date.now() & 0xffff);
  const sheet = useMemo(
    () => makeSheet(sheetWidth, sheetHeight, seed, Math.max(26, Math.min(40, sheetWidth / 12))),
    [sheetWidth, sheetHeight, seed],
  );
  const [popped, setPopped] = useState<ReadonlySet<number>>(new Set());
  const poppedRef = useRef(new Set<number>());
  const [bursts, setBursts] = useState<readonly Burst[]>([]);
  const [total, setTotal] = useState(0);
  const burstId = useRef(1);
  const now = useSharedValue(0);
  const roll = useSharedValue(0);
  useFrameCallback(() => {
    now.set(Date.now());
  });

  useEffect(() => {
    void storage
      .getItem(COUNT_KEY)
      .catch(() => null)
      .then((raw) => setTotal(Number(raw) || 0));
  }, []);
  useEffect(() => {
    if (total > 0) void storage.setItem(COUNT_KEY, String(total)).catch(() => undefined);
  }, [total]);

  const freshSheet = () => {
    poppedRef.current = new Set();
    setPopped(new Set());
    setSeed((s) => (s * 31 + 7) & 0xffff);
    if (!calmMotion) {
      roll.set(1);
      roll.set(withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) }));
    }
  };

  // A finished sheet rolls away and a new one rolls in.
  useEffect(() => {
    if (popped.size === 0 || popped.size < sheet.bubbles.length) return;
    const timer = setTimeout(freshSheet, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popped.size, sheet.bubbles.length]);

  const popAt = (x: number, y: number) => {
    const i = bubbleAt(sheet, x - left, y - top);
    if (i < 0 || poppedRef.current.has(i)) return;
    poppedRef.current.add(i);
    setPopped(new Set(poppedRef.current));
    const b = sheet.bubbles[i]!;
    if (b.golden) {
      haptics.delight();
      sounds.play('golden');
    } else {
      haptics.pop();
      sounds.play(b.pitch > 0.33 ? 'popHigh' : b.pitch < -0.33 ? 'popLow' : 'pop');
    }
    setTotal((n) => n + 1);
    const at = Date.now();
    setBursts((list) => [
      ...list.filter((x) => at - x.at < BURST_MS),
      { id: burstId.current++, x: b.x, y: b.y, r: b.r, golden: b.golden, at },
    ]);
  };

  const gesture = useToyGesture({
    onBegin: (p) => {
      chrome.touching(true);
      popAt(p.x, p.y);
    },
    onMove: (p) => popAt(p.x, p.y),
    onEnd: () => chrome.touching(false),
  });

  const picture = useMemo(
    () =>
      createPicture((c) => drawSheet(c, sheet, popped, look), {
        width: sheetWidth,
        height: sheetHeight,
      }),
    [sheet, popped, look, sheetWidth, sheetHeight],
  );
  const sheetTransform = useDerivedValue(() => [
    { translateX: left },
    { translateY: top + roll.get() * (sheetHeight + top) },
  ]);

  return (
    <ToyShell
      toy={TOY}
      background={look.background}
      tools={
        <>
          <View style={styles.row}>
            <View
              style={[
                styles.counter,
                { backgroundColor: theme.glass, borderColor: theme.glassBorder },
              ]}
            >
              <AppText variant="heading" accessibilityLiveRegion="polite">
                🫧 {t('bubbles.popped', { count: total })}
              </AppText>
            </View>
            <Button
              compact
              kind="secondary"
              icon="refresh"
              label={t('bubbles.newSheet')}
              onPress={freshSheet}
            />
          </View>
          <LookBar toy="bubbles" current={look} onChoose={choose} />
        </>
      }
    >
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Rect x={0} y={0} width={width} height={height}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(width, height)}
                colors={[look.background, look.backgroundEdge]}
              />
            </Rect>
            <Group transform={sheetTransform}>
              <Picture picture={picture} />
              {bursts.map((b) => (
                <BurstMark key={b.id} burst={b} now={now} />
              ))}
            </Group>
          </Canvas>
        </View>
      </GestureDetector>
    </ToyShell>
  );
}

/** The puff of a pop: a ring of air spreading out, with sparkles for a golden one. */
function BurstMark({ burst, now }: { burst: Burst; now: SharedValue<number> }) {
  const t = useDerivedValue(() => Math.min(1, (now.get() - burst.at) / BURST_MS));
  const r = useDerivedValue(() => burst.r * (1 + t.get() * 0.7));
  const opacity = useDerivedValue(() => (1 - t.get()) * 0.7);
  const sparkles = burst.golden ? 10 : 0;
  return (
    <Group opacity={opacity}>
      <Circle
        cx={burst.x}
        cy={burst.y}
        r={r}
        style="stroke"
        strokeWidth={2}
        color={burst.golden ? '#ffd447' : 'white'}
      />
      {Array.from({ length: sparkles }, (_, k) => (
        <Sparkle key={k} burst={burst} t={t} angle={(k / sparkles) * Math.PI * 2} />
      ))}
    </Group>
  );
}

function Sparkle({ burst, t, angle }: { burst: Burst; t: SharedValue<number>; angle: number }) {
  const cx = useDerivedValue(() => burst.x + Math.cos(angle) * burst.r * (0.6 + t.get() * 2.2));
  const cy = useDerivedValue(() => burst.y + Math.sin(angle) * burst.r * (0.6 + t.get() * 2.2));
  return <Circle cx={cx} cy={cy} r={3} color="#fff2a8" />;
}

/** Paints the whole sheet: plastic film, then every bubble, whole or popped. */
function drawSheet(c: SkCanvas, sheet: Sheet, popped: ReadonlySet<number>, look: Look): void {
  const film = Skia.Paint();
  film.setColor(Skia.Color('rgba(255,255,255,0.10)'));
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, sheet.width, sheet.height), 18, 18), film);

  const shadow = Skia.Paint();
  shadow.setAntiAlias(true);
  shadow.setColor(Skia.Color('rgba(20, 30, 60, 0.22)'));
  shadow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 4, true));
  const rim = Skia.Paint();
  rim.setAntiAlias(true);
  rim.setStyle(PaintStyle.Stroke);
  rim.setStrokeWidth(1.2);
  rim.setColor(Skia.Color('rgba(255,255,255,0.65)'));
  const shine = Skia.Paint();
  shine.setAntiAlias(true);
  shine.setColor(Skia.Color('rgba(255,255,255,0.9)'));
  const flat = Skia.Paint();
  flat.setAntiAlias(true);
  const crease = Skia.Paint();
  crease.setAntiAlias(true);
  crease.setStyle(PaintStyle.Stroke);
  crease.setStrokeWidth(1.4);
  crease.setColor(Skia.Color('rgba(40, 50, 80, 0.22)'));

  sheet.bubbles.forEach((b, i) => {
    const tint = b.golden ? '#ffd447' : look.colors[i % look.colors.length]!;
    if (popped.has(i)) {
      drawPopped(c, b, tint, flat, crease);
      return;
    }
    c.drawCircle(b.x + 2, b.y + 4, b.r, shadow);
    const body = Skia.Paint();
    body.setAntiAlias(true);
    body.setShader(
      Skia.Shader.MakeRadialGradient(
        { x: b.x - b.r * 0.35, y: b.y - b.r * 0.4 },
        b.r * 1.5,
        b.golden
          ? [Skia.Color('#fffbe0'), Skia.Color('#ffd447'), Skia.Color('#c98a00')]
          : [
              Skia.Color('rgba(255,255,255,0.95)'),
              Skia.Color(withAlpha(tint, 0.55)),
              Skia.Color(withAlpha(tint, 0.3)),
            ],
        [0, 0.55, 1],
        TileMode.Clamp,
      ),
    );
    c.drawCircle(b.x, b.y, b.r, body);
    c.drawCircle(b.x, b.y, b.r, rim);
    c.drawOval(Skia.XYWHRect(b.x - b.r * 0.55, b.y - b.r * 0.62, b.r * 0.42, b.r * 0.26), shine);
  });
}

function drawPopped(
  c: SkCanvas,
  b: Bubble,
  tint: string,
  flat: ReturnType<typeof Skia.Paint>,
  crease: ReturnType<typeof Skia.Paint>,
): void {
  flat.setColor(Skia.Color(withAlpha(tint, 0.16)));
  c.drawCircle(b.x, b.y, b.r * 0.92, flat);
  const k = b.pitch;
  const path = Skia.PathBuilder.Make()
    .moveTo(b.x - b.r * 0.6, b.y + b.r * 0.1 * k)
    .quadTo(b.x - b.r * 0.1, b.y - b.r * 0.35, b.x + b.r * 0.55, b.y + b.r * 0.2 * k)
    .moveTo(b.x - b.r * 0.2, b.y + b.r * 0.45)
    .quadTo(b.x + b.r * 0.1, b.y + b.r * 0.15, b.x + b.r * 0.35, b.y + b.r * 0.5)
    .build();
  c.drawPath(path, crease);
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  counter: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
