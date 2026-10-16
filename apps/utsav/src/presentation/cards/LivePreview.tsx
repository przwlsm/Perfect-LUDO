import { useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { Canvas, Group, Image, Path } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { clampZoom, dragPhoto, photoCover, type Rect } from '@/application/layout';
import type { CardSpec, PhotoSpec } from '@/domain/entities/Card';
import type { Template } from '@/domain/entities/Template';
import { useCardFonts } from './fonts';
import { CardThumb } from './CardThumb';
import { FxLayer } from './Fx';
import { paletteOf, photoClip } from './paint/card';
import { mix } from './paint/kit';
import { usePhoto } from './photo';
import { renderBack, renderFront } from './render';

interface Props {
  readonly spec: CardSpec;
  readonly template: Template;
  readonly plus: boolean;
  /** Size on screen, in dp; the card's shape follows its format. */
  readonly width: number;
  readonly height: number;
  /** Sparkles and flicker; off under calmer motion. */
  readonly animate: boolean;
  /** Called after a pinch or drag on the photo. */
  readonly onPhotoMove?: (photo: Pick<PhotoSpec, 'zoom' | 'x' | 'y'>) => void;
}

/**
 * The editor's card: the art and the words are baked into two images at
 * screen resolution; the photo sits between them so pinching and dragging
 * it never redraws the card; a light animated layer sits on top.
 */
export function LivePreview({ spec, template, plus, width, height, animate, onPhotoMove }: Props) {
  const fonts = useCardFonts();
  const photo = usePhoto(spec.photo?.uri);
  const px = Math.round(width * Math.min(PixelRatio.get(), 3));
  const scale = width / 1080;
  const palette = paletteOf({ spec, template });

  // Until the live layers are drawn, the cached still of the card stands in.
  const [firstSpec] = useState(spec);
  const hasPhoto = spec.photo !== null;
  const shape = spec.photo?.shape ?? 'circle';
  // The layers are drawn just after a frame is shown (not during render), so
  // swiping and typing stay smooth; the last picture stays up meanwhile.
  const backKey = fonts ? `${px}|${template.id}|${spec.palette}|${spec.format}` : '';
  const frontKey = fonts
    ? JSON.stringify([
        px,
        template.id,
        spec.palette,
        spec.format,
        spec.headline,
        spec.message,
        spec.from,
        spec.language,
        spec.type,
        plus,
        hasPhoto,
        shape,
      ])
    : '';
  const latest = useRef({ spec, template, plus });
  useEffect(() => {
    latest.current = { spec, template, plus };
  });
  const [back, setBack] = useState<ReturnType<typeof renderBack>>(null);
  const [front, setFront] = useState<ReturnType<typeof renderFront>>(null);
  useEffect(() => {
    if (!fonts || !backKey) return;
    const timer = setTimeout(() => {
      const { spec: s, template: t, plus: p } = latest.current;
      setBack(renderBack({ spec: s, template: t, plus: p, fonts, photo: null }, px));
    }, 0);
    return () => clearTimeout(timer);
  }, [backKey, fonts, px]);
  useEffect(() => {
    if (!fonts || !frontKey) return;
    const timer = setTimeout(() => {
      const { spec: s, template: t, plus: p } = latest.current;
      setFront(renderFront({ spec: s, template: t, plus: p, fonts, photo: null }, px));
    }, 0);
    return () => clearTimeout(timer);
  }, [frontKey, fonts, px]);

  const frame: Rect | null = front?.layout.photo
    ? {
        x: front.layout.photo.x * scale,
        y: front.layout.photo.y * scale,
        w: front.layout.photo.w * scale,
        h: front.layout.photo.h * scale,
      }
    : null;
  const clip = useMemo(
    () => (frame ? photoClip(frame, shape) : null),
    [frame?.x, frame?.y, frame?.w, frame?.h, shape],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = useSharedValue(spec.photo?.zoom ?? 1);
  const ox = useSharedValue(spec.photo?.x ?? 0);
  const oy = useSharedValue(spec.photo?.y ?? 0);
  const start = useSharedValue({ zoom: 1, x: 0, y: 0 });
  useEffect(() => {
    zoom.set(spec.photo?.zoom ?? 1);
    ox.set(spec.photo?.x ?? 0);
    oy.set(spec.photo?.y ?? 0);
  }, [spec.photo?.zoom, spec.photo?.x, spec.photo?.y, spec.photo?.uri, zoom, ox, oy]);

  const imgW = photo?.width() ?? 1;
  const imgH = photo?.height() ?? 1;
  const fx = frame?.x ?? 0;
  const fy = frame?.y ?? 0;
  const fw = frame?.w ?? 1;
  const fh = frame?.h ?? 1;
  const rect = useDerivedValue(() => {
    const r = photoCover(
      imgW,
      imgH,
      { x: fx, y: fy, w: fw, h: fh },
      zoom.get(),
      ox.get(),
      oy.get(),
    );
    return { x: r.x, y: r.y, width: r.w, height: r.h };
  });

  const gesture = useMemo(() => {
    const report = () => onPhotoMove?.({ zoom: zoom.get(), x: ox.get(), y: oy.get() });
    const box = { x: fx, y: fy, w: fw, h: fh };
    const pan = Gesture.Pan()
      .runOnJS(true)
      .enabled(hasPhoto && !!onPhotoMove)
      .onStart(() => start.set({ zoom: zoom.get(), x: ox.get(), y: oy.get() }))
      .onUpdate((e) => {
        const s = start.get();
        const next = dragPhoto(
          imgW,
          imgH,
          box,
          zoom.get(),
          s.x,
          s.y,
          e.translationX,
          e.translationY,
        );
        ox.set(next.x);
        oy.set(next.y);
      })
      .onEnd(report);
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .enabled(hasPhoto && !!onPhotoMove)
      .onStart(() => start.set({ zoom: zoom.get(), x: ox.get(), y: oy.get() }))
      .onUpdate((e) => zoom.set(clampZoom(start.get().zoom * e.scale)))
      .onEnd(report);
    return Gesture.Simultaneous(pan, pinch);
  }, [hasPhoto, onPhotoMove, imgW, imgH, fx, fy, fw, fh, zoom, ox, oy, start]);

  const clock = useSharedValue(0);
  useFrameCallback((f) => {
    if (animate) clock.set(f.timeSinceFirstFrame / 1000);
  });

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.wrap, { width, height }]} collapsable={false}>
        {!(back && front) && (
          <CardThumb
            spec={firstSpec}
            width={width}
            radius={0}
            urgent
            style={StyleSheet.absoluteFill}
          />
        )}
        <Canvas style={{ width, height }}>
          {back && (
            <Image image={back.image} x={0} y={0} width={width} height={height} fit="fill" />
          )}
          {clip && (
            <Group clip={clip}>
              <Path path={clip} color={mix(palette.bg[0], palette.gold, 0.25)} />
              {photo && <Image image={photo} rect={rect} fit="fill" />}
            </Group>
          )}
          {front && (
            <Image image={front.image} x={0} y={0} width={width} height={height} fit="fill" />
          )}
          {animate && back && (
            <Group transform={[{ scale }]}>
              <FxLayer
                kind={template.fx}
                anchors={back.fx}
                lights={back.lights}
                W={1080}
                H={spec.format === 'story' ? 1920 : 1080}
                palette={palette}
                clock={clock}
              />
            </Group>
          )}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
