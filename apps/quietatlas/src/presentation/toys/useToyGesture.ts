import { useEffect, useMemo, useRef } from 'react';
import { Gesture, type ComposedGesture, type GestureType } from 'react-native-gesture-handler';

export interface ToyTouch {
  readonly x: number;
  readonly y: number;
}

interface ToyGestureHandlers {
  /** Finger down (or, with `minDistance`, finger started moving). */
  readonly onBegin?: (p: ToyTouch) => void;
  readonly onMove?: (p: ToyTouch) => void;
  /** Finger lifted or the gesture was cancelled. */
  readonly onEnd?: () => void;
  /** A quick tap, recognised separately from a drag (exclusive with it). */
  readonly onTap?: (p: ToyTouch) => void;
  /** Dp of travel before a drag starts; 0 makes every touch a drag. */
  readonly minDistance?: number;
}

/**
 * One-finger touch handling for a toy, on the JS thread (toys keep their
 * models in plain JS). The gesture is built once; the handlers are read
 * through a ref that always holds the latest render's functions, so toys can
 * pass ordinary closures.
 */
export function useToyGesture(handlers: ToyGestureHandlers): GestureType | ComposedGesture {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  const minDistance = handlers.minDistance ?? 0;
  const tappable = handlers.onTap !== undefined;
  return useMemo(() => {
    // The builder only stores these callbacks; gesture events call them
    // later, never during render.
    /* eslint-disable react-hooks/refs */
    const pan = Gesture.Pan()
      .minDistance(minDistance)
      .maxPointers(1)
      .runOnJS(true)
      .onStart((e) => {
        if (minDistance > 0) latest.current.onBegin?.({ x: e.x, y: e.y });
      })
      .onBegin((e) => {
        if (minDistance === 0) latest.current.onBegin?.({ x: e.x, y: e.y });
      })
      .onUpdate((e) => latest.current.onMove?.({ x: e.x, y: e.y }))
      .onFinalize(() => latest.current.onEnd?.());
    if (!tappable) return pan;
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((e) => latest.current.onTap?.({ x: e.x, y: e.y }));
    /* eslint-enable react-hooks/refs */
    return Gesture.Exclusive(pan, tap);
  }, [minDistance, tappable]);
}
