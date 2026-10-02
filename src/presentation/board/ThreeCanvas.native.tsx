/** Native counterpart of ThreeCanvas.tsx — see that file for why this split exists. */
import { useEffect, useState, type ComponentProps } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { Canvas as FiberCanvas, useThree } from '@react-three/fiber/native';

export { useFrame, useThree, type ThreeEvent } from '@react-three/fiber/native';

type TouchTarget = { dispatchEvent(event: unknown): void };

/**
 * Where the touch layer sends events: the scene registers its canvas here
 * once it exists. A plain object rather than state, because the scene lives
 * in fiber's own renderer and mounts during this component's own commit.
 */
class TouchLink {
  private target: TouchTarget | null = null;
  attach(target: TouchTarget | null) {
    this.target = target;
  }
  dispatch(event: unknown) {
    this.target?.dispatchEvent(event);
  }
}

/**
 * The 3D canvas, with our own touch layer in place of fiber's.
 *
 * Fiber's native canvas takes touches with a PanResponder that blocks the
 * native responder, which on Android stops react-native-gesture-handler from
 * ever seeing the gesture: the board's pinch-to-zoom and pan were dead in 3D.
 * This layer forwards the same pointer events to the scene (so tapping a
 * coin works exactly as before) but leaves native gestures free to take over.
 */
export function Canvas({ children, style, ...props }: ComponentProps<typeof FiberCanvas>) {
  const [link] = useState(() => new TouchLink());
  const [responder] = useState(() => {
    const send = (event: GestureResponderEvent, type: string) => {
      event.persist();
      link.dispatch(
        Object.assign(event.nativeEvent, {
          type,
          offsetX: event.nativeEvent.locationX,
          offsetY: event.nativeEvent.locationY,
          pointerType: 'touch',
          pointerId: event.nativeEvent.identifier,
        }),
      );
      return true;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => true,
      // The fix: let pinch and pan (native gestures) win once they start.
      onShouldBlockNativeResponder: () => false,
      onStartShouldSetPanResponderCapture: (event) => send(event, 'pointercapture'),
      onPanResponderStart: (event) => send(event, 'pointerdown'),
      onPanResponderMove: (event) => send(event, 'pointermove'),
      onPanResponderEnd: (event, state) => {
        send(event, 'pointerup');
        if (Math.hypot(state.dx, state.dy) < 20) send(event, 'click');
      },
      onPanResponderRelease: (event) => send(event, 'pointerleave'),
      onPanResponderTerminate: (event) => send(event, 'lostpointercapture'),
      onPanResponderReject: (event) => send(event, 'lostpointercapture'),
    });
  });

  return (
    <View style={[{ flex: 1 }, style]}>
      <FiberCanvas {...props} pointerEvents="none">
        <TouchTargetBridge link={link} />
        {children}
      </FiberCanvas>
      <View style={StyleSheet.absoluteFill} {...responder.panHandlers} />
    </View>
  );
}

/** Hands the canvas element (where fiber listens for pointer events) to the touch layer. */
function TouchTargetBridge({ link }: { link: TouchLink }) {
  const element = useThree((state) => state.gl.domElement) as unknown as TouchTarget;
  useEffect(() => {
    link.attach(element);
    return () => link.attach(null);
  }, [element, link]);
  return null;
}
