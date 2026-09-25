/**
 * The one place the 3D renderer is imported from. react-three-fiber ships
 * two builds — a browser one at the package root and a React Native one
 * under `/native` (backed by expo-gl) — and every module in the 3D chain
 * must use the same build, or hooks lose the Canvas context and, on a
 * phone, the browser build fails to even load. Metro picks
 * `ThreeCanvas.native.tsx` on Android/iOS and this file on web.
 */
export { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
