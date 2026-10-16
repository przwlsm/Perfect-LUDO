import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/** A gold coin: warm radial-looking gradient, darker rim, bright specular dot. */
export function CoinIcon({ size = 22 }: { size?: number }) {
  return (
    <LinearGradient
      colors={['#fde68a', '#fcd34d', '#d97706']}
      start={{ x: 0.2, y: 0.1 }}
      end={{ x: 0.8, y: 0.95 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: Math.max(1.5, size * 0.09),
        borderColor: '#b45309',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.46,
          height: size * 0.46,
          borderRadius: size,
          borderWidth: Math.max(1, size * 0.07),
          borderColor: '#b4530999',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.16,
          left: size * 0.22,
          width: size * 0.18,
          height: size * 0.12,
          borderRadius: size,
          backgroundColor: '#ffffffcc',
        }}
      />
    </LinearGradient>
  );
}

/** A cut gem: a turned square with a lighter crown facet. */
export function GemIcon({ size = 22 }: { size?: number }) {
  const side = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient
        colors={['#e9d5ff', '#c084fc', '#9333ea']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: side,
          height: side,
          borderRadius: side * 0.18,
          borderWidth: 1.5,
          borderColor: '#6b21a8',
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.24,
          width: size * 0.22,
          height: size * 0.14,
          borderRadius: size,
          backgroundColor: '#ffffffb3',
        }}
      />
    </View>
  );
}
