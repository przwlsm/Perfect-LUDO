import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  FadeIn,
  FadeOut,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  breathAt,
  PATTERNS,
  SESSION_MINUTES,
  type BreathPattern,
  type BreathPhase,
} from '@/application/breath/breath';
import { toyById } from '@/domain/entities/Toy';
import { reviews } from '@/config/container';
import { AppText, Button, Pressy } from '../components/Kit';
import { useSettings } from '../state/SettingsProvider';
import { mix } from '../theme/color';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';
import { LookBar, useLook } from './Looks';
import { ToyShell } from './ToyShell';

const TOY = toyById('candle')!;

/**
 * Hygge breathing: a candle on a winter evening. The flame grows as you
 * breathe in, rests while you hold, and settles as you breathe out, with a
 * soft bell at each turn. Sessions of one, three or five minutes.
 */
export function CandleToy() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { haptics, sounds, calmMotion, settings, update } = useSettings();
  const { look, choose } = useLook('candle');
  const [wax, flameTint] = look.colors as [string, string];

  const [pattern, setPattern] = useState<BreathPattern>(PATTERNS[0]!);
  const [minutes, setMinutes] = useState<number>(SESSION_MINUTES[0]);
  const [running, setRunning] = useState(false);
  const [moment, setMoment] = useState<{
    phase: BreathPhase;
    secondsLeft: number;
    cycle: number;
  } | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const elapsed = useRef(0);
  const fullness = useSharedValue(0.25);
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    clock.set(frame.timeSinceFirstFrame / 1000);
  });

  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    let prevPhase: BreathPhase | null = null;
    let prevSeconds = -1;
    let raf = requestAnimationFrame(function step() {
      const now = Date.now();
      elapsed.current += now - last;
      last = now;
      const m = breathAt(pattern, elapsed.current);
      fullness.set(m.fullness);
      const turned = m.phase !== prevPhase;
      if (turned) {
        prevPhase = m.phase;
        if (m.phase === 'in') sounds.play('chime');
        if (m.phase === 'out') sounds.play('chimeLow');
        haptics.thump();
      }
      if (turned || m.secondsLeft !== prevSeconds) {
        prevSeconds = m.secondsLeft;
        setMoment({ phase: m.phase, secondsLeft: m.secondsLeft, cycle: m.cycle });
      }
      if (elapsed.current >= minutes * 60_000 && m.phase !== 'in' && m.phase !== 'hold') {
        setRunning(false);
        setDone(m.cycle + 1);
        haptics.delight();
        sounds.play('chime');
        return;
      }
      raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [running, pattern, minutes, fullness, haptics, sounds]);

  // After a whole session, the store's own review card may be offered once.
  useEffect(() => {
    if (done === null || settings.reviewAsked) return;
    update({ reviewAsked: true });
    const timer = setTimeout(() => void reviews.request(), 2500);
    return () => clearTimeout(timer);
  }, [done, settings.reviewAsked, update]);

  const start = () => {
    elapsed.current = 0;
    setDone(null);
    setRunning(true);
  };
  const stop = () => {
    setRunning(false);
    setMoment(null);
    fullness.set(withTiming(0.25, { duration: 1200 }));
  };

  // The candle sits low in the frame; the flame rises with the breath.
  const cx = width / 2;
  const baseY = height * 0.62;
  const candleW = Math.min(width * 0.26, 120);
  const candleH = Math.min(height * 0.22, 190);
  const flameH = candleW * 0.85;

  const flame = useDerivedValue(() => {
    const sway = calmMotion
      ? 0
      : Math.sin(clock.get() * 2.3) * 0.06 + Math.sin(clock.get() * 5.1 + 1) * 0.03;
    const flicker = calmMotion ? 1 : 1 + Math.sin(clock.get() * 9.7) * 0.03;
    const h = flameH * (0.55 + fullness.get() * 0.75) * flicker;
    const w = candleW * 0.22 * (0.85 + fullness.get() * 0.3);
    const tipX = cx + sway * h;
    const top = baseY - h;
    return Skia.PathBuilder.Make()
      .moveTo(cx, baseY + w * 0.2)
      .cubicTo(cx - w * 1.1, baseY, cx - w * 0.9, baseY - h * 0.45, tipX, top)
      .cubicTo(cx + w * 0.9, baseY - h * 0.45, cx + w * 1.1, baseY, cx, baseY + w * 0.2)
      .close()
      .build();
  });
  const haloR = useDerivedValue(() => candleW * (1.6 + fullness.get() * 1.4));
  const haloOpacity = useDerivedValue(() => 0.35 + fullness.get() * 0.45);
  const innerR = useDerivedValue(() => candleW * 0.11 * (0.8 + fullness.get() * 0.5));

  const phaseLabel = moment ? t(`candle.${moment.phase}`) : done !== null ? t('candle.done') : '';

  return (
    <ToyShell
      toy={TOY}
      background={look.backgroundEdge}
      tools={
        <>
          {!running && (
            <View style={styles.chips}>
              {PATTERNS.map((p) => (
                <Chip
                  key={p.id}
                  label={t(`candle.patterns.${p.id}`)}
                  active={p.id === pattern.id}
                  onPress={() => setPattern(p)}
                />
              ))}
            </View>
          )}
          {!running && (
            <View style={styles.chips}>
              {SESSION_MINUTES.map((m) => (
                <Chip
                  key={m}
                  label={t('candle.minutes', { count: m })}
                  active={m === minutes}
                  onPress={() => setMinutes(m)}
                />
              ))}
            </View>
          )}
          <View style={styles.chips}>
            <Button
              icon={running ? 'pause' : 'play'}
              label={running ? t('candle.pause') : t('candle.start')}
              onPress={running ? stop : start}
              style={styles.startButton}
            />
          </View>
          {!running && <LookBar toy="candle" current={look} onChoose={choose} />}
        </>
      }
    >
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={[look.backgroundEdge, look.background, look.backgroundEdge]}
          />
        </Rect>
        {/* Warm light filling the room with each in-breath. */}
        <Circle cx={cx} cy={baseY - flameH * 0.5} r={haloR} opacity={haloOpacity}>
          <RadialGradient
            c={vec(cx, baseY - flameH * 0.5)}
            r={candleW * 3}
            colors={[flameTint, 'rgba(0,0,0,0)']}
          />
        </Circle>
        {/* Wax, with the light catching its top. */}
        <RoundedRect
          x={cx - candleW / 2}
          y={baseY + 6}
          width={candleW}
          height={candleH}
          r={candleW * 0.12}
        >
          <LinearGradient
            start={vec(cx - candleW / 2, 0)}
            end={vec(cx + candleW / 2, 0)}
            colors={[
              mix(wax, '#000000', 0.45),
              wax,
              mix(wax, '#ffffff', 0.6),
              wax,
              mix(wax, '#000000', 0.55),
            ]}
            positions={[0, 0.32, 0.42, 0.62, 1]}
          />
        </RoundedRect>
        <RoundedRect
          x={cx - candleW / 2}
          y={baseY + 6}
          width={candleW}
          height={candleH}
          r={candleW * 0.12}
          color={wax}
          opacity={0.35}
        />
        <Rect x={cx - 1.5} y={baseY - 4} width={3} height={14} color="#2a1c12" />
        <Group>
          <Path path={flame} color={flameTint}>
            <BlurMask blur={6} style="solid" />
          </Path>
          <Path path={flame} color="#fff3c4" opacity={0.85}>
            <BlurMask blur={3} style="normal" />
          </Path>
          <Circle cx={cx} cy={baseY - flameH * 0.12} r={innerR} color="#9fd3ff" opacity={0.3}>
            <BlurMask blur={4} style="normal" />
          </Circle>
        </Group>
      </Canvas>

      <View style={[styles.guide, { top: height * 0.17 }]} pointerEvents="none">
        {phaseLabel !== '' && (
          <Animated.View
            key={phaseLabel}
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(300)}
            style={styles.center}
          >
            <AppText variant="display" center accessibilityLiveRegion="polite">
              {phaseLabel}
            </AppText>
            {moment && (
              <AppText variant="title" center color={theme.accentText}>
                {moment.secondsLeft}
              </AppText>
            )}
            {done !== null && !moment && (
              <AppText variant="body" center color={theme.muted}>
                {t('candle.doneBody', { count: done })}
              </AppText>
            )}
          </Animated.View>
        )}
        {moment && (
          <AppText variant="caption" center>
            {t('candle.breaths', { count: moment.cycle })}
          </AppText>
        )}
      </View>
    </ToyShell>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressy
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        { backgroundColor: active ? theme.accent : theme.glass, borderColor: theme.glassBorder },
      ]}
    >
      <AppText
        variant="caption"
        color={active ? theme.onAccent : theme.text}
        style={styles.chipText}
      >
        {label}
      </AppText>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipText: { fontFamily: FONTS.bodyBold },
  startButton: { minWidth: 180 },
  guide: { position: 'absolute', left: 24, right: 24, alignItems: 'center', gap: 6 },
  center: { alignItems: 'center', gap: 4 },
});
