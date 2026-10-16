import { useMemo } from 'react';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { mix, random } from 'app-kit';
import type { Skyline as SkylineKind } from '@/domain/content/languages';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { autoRickshaw, city, landmark } from './shapes';

interface SkylineProps {
  readonly kind: SkylineKind;
  readonly width: number;
  readonly height: number;
  /** An auto-rickshaw (or a boat) crosses now and then; off under calmer motion. */
  readonly lively?: boolean;
}

/**
 * A city at golden hour (Day) or as its lights come on (Dusk): sky, sun,
 * distant blocks, the city's landmark silhouette, near buildings with lit
 * windows, and the road or the water.
 */
export function Skyline({ kind, width: W, height: H, lively = false }: SkylineProps) {
  const theme = useTheme();
  const { calmMotion } = useSettings();
  const dusk = theme.scheme === 'dusk';
  const scene = useMemo(() => {
    if (W <= 0 || H <= 0) return null;
    return { mark: landmark(kind, W, H), city: city(kind, W, H), auto: autoRickshaw(H / 100) };
  }, [kind, W, H]);
  const stars = useMemo(() => {
    const r = random(7 + Math.round(W));
    return Array.from({ length: 18 }, () => ({
      x: r() * W,
      y: r() * H * 0.45,
      s: 0.6 + r() * 1.1,
    }));
  }, [W, H]);

  const animate = lively && !calmMotion;
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    if (animate) clock.set(frame.timeSinceFirstFrame / 1000);
  }, animate);
  const u = H / 100;
  const lap = W + 40 * u;
  const g0 = H * 0.84;
  const drive = useDerivedValue(() => {
    const x = ((clock.get() * 9 * u) % lap) - 20 * u;
    return [{ translateX: x }, { translateY: g0 + (H - g0) * 0.5 }];
  });
  const sail = useDerivedValue(() => {
    const x = W - (((clock.get() * 4 * u) % lap) - 20 * u);
    return [{ translateX: x }, { translateY: H * 0.9 + Math.sin(clock.get() * 1.6) * 0.5 * u }];
  });

  const boat = useBoat(u);
  if (!scene) return null;
  const g = scene.city.ground;
  const mark = mix(theme.cityFar, theme.cityNear, 0.62);
  return (
    <Canvas style={{ width: W, height: H }} pointerEvents="none">
      <Rect x={0} y={0} width={W} height={H}>
        <LinearGradient start={vec(0, 0)} end={vec(0, g)} colors={[...theme.sky]} />
      </Rect>
      {dusk &&
        stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.s} color="#fff6dc" opacity={0.75} />
        ))}
      <Group>
        <Circle
          cx={W * 0.2}
          cy={H * (dusk ? 0.62 : 0.34)}
          r={H * 0.15}
          color={theme.sun}
          opacity={0.55}
        >
          <BlurMask blur={H * 0.08} style="normal" />
        </Circle>
        <Circle cx={W * 0.2} cy={H * (dusk ? 0.62 : 0.34)} r={H * 0.085} color={theme.sun} />
      </Group>
      <Path path={scene.city.far} color={theme.cityFar} opacity={0.85} />
      <Path path={scene.mark.fill} color={mark} />
      {scene.mark.stroke && (
        <Path
          path={scene.mark.stroke}
          color={mark}
          style="stroke"
          strokeWidth={scene.mark.strokeWidth}
          strokeCap="round"
        />
      )}
      <Path path={scene.city.near} color={theme.cityNear} />
      <Path path={scene.city.lit} color={theme.windows} opacity={dusk ? 0.9 : 0.3} />
      {scene.mark.water ? (
        <>
          <Rect x={0} y={g} width={W} height={H - g}>
            <LinearGradient
              start={vec(0, g)}
              end={vec(0, H)}
              colors={[mix(theme.sky[2], theme.cityNear, 0.45), theme.cityNear]}
            />
          </Rect>
          {[0.25, 0.5, 0.75].map((f, i) => (
            <Rect
              key={i}
              x={W * (0.1 + 0.27 * i)}
              y={g + (H - g) * f}
              width={W * 0.16}
              height={Math.max(1, u * 0.5)}
              color={theme.sun}
              opacity={0.35}
            />
          ))}
          <Group transform={sail}>
            <Path path={boat.hull} color={theme.cityNear} />
            <Rect x={-0.3 * u} y={-9 * u} width={0.6 * u} height={8 * u} color={theme.cityNear} />
            <Path path={boat.sail} color={theme.accent} />
          </Group>
        </>
      ) : (
        <>
          <Rect x={0} y={g} width={W} height={H - g} color={theme.cityNear} />
          {Array.from({ length: Math.ceil(W / (12 * u)) }, (_, i) => (
            <Rect
              key={i}
              x={i * 12 * u}
              y={g + (H - g) * 0.62}
              width={5 * u}
              height={Math.max(1, u * 0.45)}
              color={theme.windows}
              opacity={0.45}
            />
          ))}
          <Group transform={drive}>
            <Path path={scene.auto.canopy} color="#1c1c1c" />
            <Path path={scene.auto.body} color={theme.accent} />
            <Path path={scene.auto.glass} color={dusk ? '#ffe9a8' : '#bfe6f0'} opacity={0.8} />
            <Circle cx={0} cy={-0.6 * u} r={1.4 * u} color="#111111" />
            <Circle cx={8.6 * u} cy={-0.6 * u} r={1.4 * u} color="#111111" />
            {dusk && (
              <Circle cx={10 * u} cy={-3 * u} r={1.6 * u} color="#fff1b8" opacity={0.9}>
                <BlurMask blur={u} style="normal" />
              </Circle>
            )}
          </Group>
        </>
      )}
    </Canvas>
  );
}

function useBoat(u: number) {
  return useMemo(() => {
    const hull = Skia.PathBuilder.Make();
    hull.moveTo(-6 * u, -1.5 * u);
    hull.quadTo(0, 2 * u, 6 * u, -1.5 * u);
    hull.close();
    const sail = Skia.PathBuilder.Make();
    sail.moveTo(0.4 * u, -9 * u);
    sail.lineTo(5 * u, -2.2 * u);
    sail.lineTo(0.4 * u, -2.2 * u);
    sail.close();
    return { hull: hull.build(), sail: sail.build() };
  }, [u]);
}
