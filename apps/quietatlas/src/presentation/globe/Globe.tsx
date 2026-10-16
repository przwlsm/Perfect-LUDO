import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  createPicture,
  Group,
  Picture,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { COMING_SOON, TOYS, type Destination, type Toy } from '@/domain/entities/Toy';
import { Pressy } from '../components/Kit';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { LAND_DOTS } from './landDots';
import { facing, project, tiltFor } from './projection';

/** Radians per second of the idle spin: one turn in about two minutes. */
const IDLE_SPIN = 0.05;
/** Pins closer to the edge than this (cos of the angle from centre) hide. */
const PIN_HORIZON = 0.12;

interface GlobeProps {
  readonly size: number;
  /** Turns the globe to face this place whenever `key` changes. */
  readonly focus: { readonly lat: number; readonly lon: number; readonly key: string };
  readonly onToy: (toy: Toy) => void;
  readonly onSoon: (destination: Destination) => void;
}

/**
 * The atlas as a small glowing planet of land dots. It turns slowly on its
 * own (unless calmer motion is on), can be spun with a sideways swipe (an
 * up-down swipe still scrolls the page), and carries a light for every toy.
 */
export function Globe({ size, focus, onToy, onSoon }: GlobeProps) {
  const theme = useTheme();
  const { calmMotion } = useSettings();
  const { t } = useTranslation();
  const radius = size * 0.42;
  const c = size / 2;

  const centerLon = useSharedValue((focus.lon * Math.PI) / 180);
  const tilt = useSharedValue(tiltFor(focus.lat));
  const dragging = useSharedValue(false);
  const idle = useSharedValue(!calmMotion);
  useEffect(() => {
    idle.set(!calmMotion);
  }, [calmMotion, idle]);

  useEffect(() => {
    const target = facing(focus.lon, centerLon.get());
    centerLon.set(withTiming(target, { duration: 1100, easing: Easing.inOut(Easing.cubic) }));
    tilt.set(withTiming(tiltFor(focus.lat), { duration: 1100 }));
    // Only a new focus should turn the globe; the shared values are stable.
  }, [focus.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrameCallback((frame) => {
    if (!idle.get() || dragging.get()) return;
    const dt = Math.min(0.05, (frame.timeSincePreviousFrame ?? 16) / 1000);
    centerLon.set(centerLon.get() - IDLE_SPIN * dt);
  });

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      dragging.set(true);
      cancelAnimation(centerLon);
    })
    .onChange((e) => {
      centerLon.set(centerLon.get() - e.changeX / radius);
    })
    .onFinalize((e) => {
      centerLon.set(withDecay({ velocity: -e.velocityX / radius, deceleration: 0.994 }));
      dragging.set(false);
    });

  const landColor = theme.land;
  const dots = useDerivedValue(() =>
    createPicture(
      (canvas) => {
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        paint.setColor(Skia.Color(landColor));
        const lon0 = centerLon.get();
        const t0 = tilt.get();
        for (let i = 0; i < LAND_DOTS.length; i += 2) {
          const p = project(LAND_DOTS[i]!, LAND_DOTS[i + 1]!, lon0, t0);
          if (p.depth <= 0.02) continue;
          paint.setAlphaf(0.25 + 0.75 * p.depth);
          canvas.drawCircle(
            c + p.x * radius,
            c - p.y * radius,
            radius * (0.009 + 0.012 * p.depth),
            paint,
          );
        }
      },
      { width: size, height: size },
    ),
  );

  const highlight = useMemo(() => vec(c - radius * 0.38, c - radius * 0.42), [c, radius]);

  return (
    <GestureDetector gesture={pan}>
      <View
        style={{ width: size, height: size }}
        accessible
        accessibilityLabel={t('home.globeA11y')}
      >
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Circle cx={c} cy={c} r={radius * 1.18}>
            <RadialGradient
              c={vec(c, c)}
              r={radius * 1.18}
              colors={[theme.seaGlow, theme.seaGlow, 'rgba(0,0,0,0)']}
              positions={[0, 0.78, 1]}
            />
          </Circle>
          <Circle cx={c} cy={c} r={radius}>
            <RadialGradient c={highlight} r={radius * 1.6} colors={[theme.sea[0], theme.sea[1]]} />
          </Circle>
          <Picture picture={dots} />
          {/* The night side: shade toward the lower right for depth. */}
          <Circle cx={c} cy={c} r={radius}>
            <RadialGradient
              c={highlight}
              r={radius * 2}
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(3,4,20,0.5)']}
              positions={[0, 0.45, 1]}
            />
          </Circle>
          <Group opacity={0.22}>
            <Circle cx={highlight.x} cy={highlight.y} r={radius * 0.22} color="white">
              <BlurMask blur={radius * 0.16} style="normal" />
            </Circle>
          </Group>
          <Circle cx={c} cy={c} r={radius} style="stroke" strokeWidth={1.5} color={theme.seaGlow}>
            <BlurMask blur={3} style="solid" />
          </Circle>
        </Canvas>
        {COMING_SOON.map((d) => (
          <Pin
            key={d.id}
            place={d}
            size={size}
            radius={radius}
            centerLon={centerLon}
            tilt={tilt}
            label={t('home.soonA11y', {
              toy: t(`soon.${d.id}.name`),
              country: t(`soon.${d.id}.country`),
            })}
            onPress={() => onSoon(d)}
          />
        ))}
        {TOYS.map((toy) => (
          <Pin
            key={toy.id}
            place={toy}
            toy={toy}
            size={size}
            radius={radius}
            centerLon={centerLon}
            tilt={tilt}
            label={t('home.pinA11y', {
              toy: t(`toys.${toy.id}.name`),
              country: t(`toys.${toy.id}.country`),
            })}
            onPress={() => onToy(toy)}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

interface PinProps {
  readonly place: { readonly lat: number; readonly lon: number };
  readonly toy?: Toy;
  readonly size: number;
  readonly radius: number;
  readonly centerLon: SharedValue<number>;
  readonly tilt: SharedValue<number>;
  readonly label: string;
  readonly onPress: () => void;
}

const TOY_PIN = 40;
const SOON_PIN = 22;

function Pin({ place, toy, size, radius, centerLon, tilt, label, onPress }: PinProps) {
  const theme = useTheme();
  const box = toy ? TOY_PIN : SOON_PIN;
  const c = size / 2;
  const style = useAnimatedStyle(() => {
    const p = project(place.lat, place.lon, centerLon.get(), tilt.get());
    const visible = Math.max(0, Math.min(1, (p.depth - PIN_HORIZON) * 5));
    return {
      opacity: visible,
      zIndex: Math.round(p.depth * 100),
      transform: [
        { translateX: c + p.x * radius - box / 2 },
        { translateY: c - p.y * radius - box / 2 },
        { scale: 0.55 + 0.45 * visible },
      ],
    };
  });
  const press = () => {
    // A pin turned to the far side is invisible; it must not take taps.
    if (project(place.lat, place.lon, centerLon.get(), tilt.get()).depth > PIN_HORIZON) onPress();
  };
  return (
    <Animated.View style={[styles.pin, { width: box, height: box }, style]}>
      <Pressy
        onPress={press}
        accessibilityLabel={label}
        hitSlop={toy ? 8 : 10}
        depth={0.85}
        style={
          toy
            ? [
                styles.toyPin,
                {
                  backgroundColor: theme.glass,
                  borderColor: toy.hue,
                  boxShadow: `0 0 16px ${toy.hue}`,
                },
              ]
            : [styles.soonPin, { borderColor: theme.land }]
        }
      >
        {toy ? (
          <Text style={styles.emblem} allowFontScaling={false}>
            {toy.emblem}
          </Text>
        ) : (
          <View style={[styles.soonDot, { backgroundColor: theme.land }]} />
        )}
      </Pressy>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pin: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  toyPin: {
    width: TOY_PIN,
    height: TOY_PIN,
    borderRadius: TOY_PIN / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblem: { fontSize: 19 },
  soonPin: {
    width: SOON_PIN,
    height: SOON_PIN,
    borderRadius: SOON_PIN / 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  soonDot: { width: 6, height: 6, borderRadius: 3 },
});
