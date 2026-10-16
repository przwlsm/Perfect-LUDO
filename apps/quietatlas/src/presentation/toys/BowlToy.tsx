import { useEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  FractalNoise,
  Group,
  RadialGradient,
  Rect,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { rub, SILENT_RIM, type RimState } from '@/application/bowl/rim';
import { toyById } from '@/domain/entities/Toy';
import { AppText, Button } from '../components/Kit';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { LookBar, useLook } from './Looks';
import { useChrome } from './ToyChrome';
import { ToyShell } from './ToyShell';
import { useToyGesture } from './useToyGesture';

const TOY = toyById('bowl')!;
/** A press shorter and stiller than this is a strike, not a rub. */
const STRIKE_MS = 260;
const STRIKE_SLOP = 10;
/** Seconds between the soft haptic pulses of a singing bowl. */
const PULSE_SECONDS = 0.75;

/**
 * A Himalayan singing bowl on its cushion, seen from above. Circle the rim
 * and the hum swells with your speed; lift and it rings down. Tap to strike.
 * Ripples run across the water inside while it sings.
 */
export function BowlToy() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { haptics, sounds } = useSettings();
  const { look, choose } = useLook('bowl');
  const chrome = useChrome();
  const cx = width / 2;
  const cy = height * 0.44;
  const R = Math.min(width, height) * 0.34;
  const [metal, metalDark, metalLight] = look.colors as [string, string, string];

  const finger = useRef<{ x: number; y: number } | null>(null);
  const press = useRef({ at: 0, x: 0, y: 0, moved: 0 });
  const rim = useRef<RimState>(SILENT_RIM);
  const pulse = useRef(0);
  const level = useSharedValue(0);
  const strike = useSharedValue(0);
  const clock = useSharedValue(0);
  const fingerX = useSharedValue(-999);
  const fingerY = useSharedValue(-999);

  useFrameCallback((frame) => {
    clock.set(frame.timeSinceFirstFrame / 1000);
  });

  // The bowl's voice runs on the JS thread: it drives the sound and haptics.
  useEffect(() => {
    let last = Date.now();
    let raf = requestAnimationFrame(function step() {
      const now = Date.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const f = finger.current;
      rim.current = rub(rim.current, f ? { x: f.x - cx, y: f.y - cy } : null, R, dt);
      const v = rim.current.level;
      level.set(v);
      sounds.hum(v);
      if (v > 0.25) {
        pulse.current += dt;
        if (pulse.current > PULSE_SECONDS) {
          pulse.current = 0;
          haptics.thump();
        }
      }
      raf = requestAnimationFrame(step);
    });
    return () => {
      cancelAnimationFrame(raf);
      sounds.hum(0);
    };
  }, [cx, cy, R, haptics, sounds, level]);

  const doStrike = () => {
    haptics.thump();
    sounds.play('strike');
    strike.set(1);
    strike.set(withTiming(0, { duration: 4200 }));
  };

  const gesture = useToyGesture({
    onBegin: (e) => {
      chrome.touching(true);
      finger.current = { x: e.x, y: e.y };
      press.current = { at: Date.now(), x: e.x, y: e.y, moved: 0 };
      fingerX.set(e.x);
      fingerY.set(e.y);
    },
    onMove: (e) => {
      finger.current = { x: e.x, y: e.y };
      press.current.moved = Math.max(
        press.current.moved,
        Math.hypot(e.x - press.current.x, e.y - press.current.y),
      );
      fingerX.set(e.x);
      fingerY.set(e.y);
    },
    onEnd: () => {
      chrome.touching(false);
      finger.current = null;
      fingerX.set(-999);
      const p = press.current;
      const onBowl = Math.hypot(p.x - cx, p.y - cy) < R * 1.15;
      if (onBowl && Date.now() - p.at < STRIKE_MS && p.moved < STRIKE_SLOP) doStrike();
    },
  });

  const glow = useDerivedValue(() => Math.max(level.get(), strike.get() * 0.8));
  const glowR = useDerivedValue(() => R * (1.12 + glow.get() * 0.12));
  const glowOpacity = useDerivedValue(() => glow.get() * 0.75);

  return (
    <ToyShell
      toy={TOY}
      background={look.backgroundEdge}
      tools={
        <>
          <View style={styles.row}>
            <Button icon="radio-button-on" label={t('bowl.strike')} onPress={doStrike} />
          </View>
          <AppText variant="caption" center color={theme.muted}>
            {t('bowl.hint')}
          </AppText>
          <LookBar toy="bowl" current={look} onChoose={choose} />
        </>
      }
    >
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Rect x={0} y={0} width={width} height={height}>
              <RadialGradient
                c={vec(cx, cy)}
                r={Math.max(width, height) * 0.8}
                colors={[look.background, look.backgroundEdge]}
              />
            </Rect>
            {/* The bowl's warmth spreading into the room as it sings. */}
            <Circle cx={cx} cy={cy} r={glowR} color={metalLight} opacity={glowOpacity}>
              <BlurMask blur={R * 0.25} style="normal" />
            </Circle>
            {/* The cushion. */}
            <Circle cx={cx} cy={cy + R * 0.06} r={R * 1.2}>
              <RadialGradient
                c={vec(cx - R * 0.3, cy - R * 0.3)}
                r={R * 1.6}
                colors={['#8a2a3a', '#4a0f1c']}
              />
            </Circle>
            <Group opacity={0.18}>
              <Circle cx={cx} cy={cy + R * 0.06} r={R * 1.2}>
                <FractalNoise freqX={1.4} freqY={1.4} octaves={2} />
              </Circle>
            </Group>
            <Circle cx={cx + R * 0.05} cy={cy + R * 0.1} r={R * 1.01} color="rgba(0,0,0,0.45)">
              <BlurMask blur={R * 0.08} style="normal" />
            </Circle>
            {/* Hammered metal: brushed light turning around the rim. */}
            <Circle cx={cx} cy={cy} r={R}>
              <SweepGradient
                c={vec(cx, cy)}
                colors={[metal, metalLight, metalDark, metal, metalLight, metalDark, metal]}
              />
            </Circle>
            <Circle
              cx={cx}
              cy={cy}
              r={R * 0.93}
              style="stroke"
              strokeWidth={R * 0.05}
              color={metalLight}
              opacity={0.35}
            />
            <Circle cx={cx} cy={cy} r={R * 0.86}>
              <RadialGradient
                c={vec(cx + R * 0.15, cy + R * 0.2)}
                r={R}
                colors={[metalDark, metal, metalLight]}
                positions={[0, 0.7, 1]}
              />
            </Circle>
            {/* Water in the bowl, rippling with the bowl's voice. */}
            <Circle cx={cx} cy={cy} r={R * 0.62} color="rgba(120, 170, 220, 0.18)" />
            {[0, 1, 2, 3].map((k) => (
              <Ripple
                key={k}
                index={k}
                cx={cx}
                cy={cy}
                R={R * 0.62}
                level={level}
                strike={strike}
                clock={clock}
              />
            ))}
            <Circle cx={cx - R * 0.35} cy={cy - R * 0.45} r={R * 0.18} color="white" opacity={0.18}>
              <BlurMask blur={R * 0.12} style="normal" />
            </Circle>
            {/* The finger, felt as a soft mallet of light on the rim. */}
            <Circle cx={fingerX} cy={fingerY} r={R * 0.09} color={metalLight} opacity={0.55}>
              <BlurMask blur={R * 0.06} style="normal" />
            </Circle>
          </Canvas>
        </View>
      </GestureDetector>
    </ToyShell>
  );
}

function Ripple({
  index,
  cx,
  cy,
  R,
  level,
  strike,
  clock,
}: {
  index: number;
  cx: number;
  cy: number;
  R: number;
  level: SharedValue<number>;
  strike: SharedValue<number>;
  clock: SharedValue<number>;
}) {
  const phase = useDerivedValue(() => (clock.get() * 0.45 + index / 4) % 1);
  const r = useDerivedValue(() => R * (0.1 + phase.get() * 0.9));
  const opacity = useDerivedValue(
    () => Math.max(level.get(), strike.get()) * (1 - phase.get()) * 0.55,
  );
  return (
    <Circle
      cx={cx}
      cy={cy}
      r={r}
      style="stroke"
      strokeWidth={1.6}
      color="white"
      opacity={opacity}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center' },
});
