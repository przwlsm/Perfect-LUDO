import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { CupDef } from '@/domain';
import { Shine } from '../components/Live';

/**
 * A cup's throne: a tall back with a crown, a cushioned seat and two legs,
 * in the hall's colours. Won thrones sit in a pool of light with a slow
 * shine; the rest are a dim silhouette waiting to be claimed.
 */
export function ThroneArt({
  cup,
  won,
  size = 96,
  shine = won,
}: {
  cup: CupDef;
  won: boolean;
  size?: number;
  shine?: boolean;
}) {
  const { base, light, gem } = cup.throne;
  const id = `throne-${cup.id}`;
  const h = size * 1.25;
  return (
    <View style={{ width: size, height: h, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Svg width={size} height={h} viewBox="0 0 100 125" opacity={won ? 1 : 0.38}>
        <Defs>
          <LinearGradient id={`${id}-back`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="0.5" stopColor={base} />
            <Stop offset="1" stopColor={base} />
          </LinearGradient>
          <LinearGradient id={`${id}-seat`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="1" stopColor={base} />
          </LinearGradient>
          <LinearGradient id={`${id}-glow`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={light} stopOpacity={won ? 0.55 : 0} />
            <Stop offset="1" stopColor={light} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* The pool of light behind a won throne. */}
        <Ellipse cx="50" cy="112" rx="46" ry="10" fill={light} opacity={won ? 0.28 : 0.08} />
        <Rect x="10" y="0" width="80" height="110" fill={`url(#${id}-glow)`} rx="40" />
        {/* The tall back with a scalloped crown. */}
        <Path
          d="M22 102 L22 30 Q22 18 32 16 L36 24 L44 10 L50 20 L56 10 L64 24 L68 16 Q78 18 78 30 L78 102 Z"
          fill={`url(#${id}-back)`}
          stroke={base}
          strokeWidth="2"
        />
        {/* The inner panel of the back. */}
        <Rect x="30" y="34" width="40" height="46" rx="8" fill="#00000022" />
        <Rect x="34" y="38" width="32" height="38" rx="6" fill={light} opacity="0.18" />
        {/* The seat cushion and the armrests. */}
        <Rect
          x="14"
          y="76"
          width="72"
          height="18"
          rx="7"
          fill={`url(#${id}-seat)`}
          stroke={base}
          strokeWidth="2"
        />
        <Rect x="10" y="66" width="12" height="30" rx="5" fill={base} />
        <Rect x="78" y="66" width="12" height="30" rx="5" fill={base} />
        <Circle cx="16" cy="66" r="6" fill={light} />
        <Circle cx="84" cy="66" r="6" fill={light} />
        {/* The legs. */}
        <Rect x="18" y="94" width="10" height="16" rx="3" fill={base} />
        <Rect x="72" y="94" width="10" height="16" rx="3" fill={base} />
        {/* The jewel on the crown; wooden thrones have none. */}
        {gem && (
          <>
            <Circle cx="50" cy="26" r="6.5" fill={gem} stroke="#ffffff" strokeWidth="1.5" />
            <Circle cx="48" cy="24" r="2" fill="#ffffff" opacity="0.8" />
          </>
        )}
      </Svg>
      {shine && won && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: h * 0.08,
            width: size * 0.6,
            height: h * 0.74,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <Shine active width={size * 1.4} every={3400} />
        </View>
      )}
    </View>
  );
}
