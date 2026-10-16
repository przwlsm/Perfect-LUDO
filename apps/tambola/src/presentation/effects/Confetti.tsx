import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Canvas, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { random } from '@/application/seed';
import { useSettings } from '../state/SettingsProvider';

const COLORS = ['#ffb627', '#ff5d9e', '#4dd6c4', '#ffd166', '#c58bff', '#ff7b54', '#ffffff'];
const COUNT = 110;
const DURATION = 2200;

/**
 * A burst of paper confetti from both bottom corners. Fires each time
 * `burst` changes to a new positive number. Skipped under calmer motion.
 */
export function Confetti({ burst }: { burst: number }) {
  const { width, height } = useWindowDimensions();
  const { calmMotion } = useSettings();
  const t = useSharedValue(1);
  useEffect(() => {
    if (burst <= 0 || calmMotion) return;
    t.set(0);
    t.set(withTiming(1, { duration: DURATION, easing: Easing.linear }));
  }, [burst, calmMotion, t]);

  const pieces = useMemo(() => {
    const r = random(burst * 7919 + 1);
    return Array.from({ length: COUNT }, (_, i) => {
      const left = i % 2 === 0;
      const angle = (left ? -60 : -120) + (r() - 0.5) * 50;
      const speed = height * (0.95 + r() * 0.75);
      const rad = (angle * Math.PI) / 180;
      return {
        x: left ? -10 : width + 10,
        y: height * 0.92,
        vx: Math.cos(rad) * speed * 0.55,
        vy: Math.sin(rad) * speed,
        spin: (r() - 0.5) * 18,
        wobble: r() * Math.PI * 2,
        w: 6 + r() * 6,
        h: 9 + r() * 8,
        color: COLORS[i % COLORS.length]!,
        round: r() < 0.25,
      };
    });
  }, [burst, width, height]);

  const picture = useDerivedValue(() => {
    const p = t.get();
    return createPicture(
      (canvas) => {
        if (p >= 1) return;
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        const s = p * (DURATION / 1000);
        const fade = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
        for (const c of pieces) {
          const drag = 1 - Math.exp(-s * 1.6);
          const x = c.x + (c.vx / 1.6) * drag + Math.sin(s * 5 + c.wobble) * 14;
          const y = c.y + (c.vy / 1.6) * drag + 0.5 * height * 0.9 * s * s;
          paint.setColor(Skia.Color(c.color));
          paint.setAlphaf(fade);
          canvas.save();
          canvas.translate(x, y);
          canvas.rotate(c.spin * s * 57, 0, 0);
          if (c.round) canvas.drawCircle(0, 0, c.w * 0.5, paint);
          else
            canvas.drawRect(
              Skia.XYWHRect(
                -c.w / 2,
                -c.h / 4,
                c.w,
                c.h / 2 + Math.abs(Math.sin(s * 8 + c.wobble)) * c.h * 0.5,
              ),
              paint,
            );
          canvas.restore();
        }
      },
      { width, height },
    );
  });

  if (burst <= 0 || calmMotion) return null;
  return (
    // The wrapper, not the canvas, keeps taps passing through on every platform.
    <View style={[StyleSheet.absoluteFill, styles.passThrough, styles.noTouch]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}

/** A gentle side-to-side shake for a bogus claim; `nudge` changes to fire it. */
export function useWobble(nudge: number) {
  const x = useSharedValue(0);
  const { calmMotion } = useSettings();
  useEffect(() => {
    if (nudge <= 0 || calmMotion) return;
    x.set(
      withSequence(
        withTiming(-12, { duration: 60 }),
        withTiming(10, { duration: 80 }),
        withTiming(-8, { duration: 80 }),
        withTiming(6, { duration: 80 }),
        withSpring(0, { damping: 8, stiffness: 300 }),
      ),
    );
  }, [nudge, calmMotion, x]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
  passThrough: { zIndex: 10 },
});
