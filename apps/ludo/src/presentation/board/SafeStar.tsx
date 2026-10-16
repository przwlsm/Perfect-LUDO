import { View } from 'react-native';
import { Text } from '../components/AppText';

/**
 * The safe-square marker: a filled star on a round badge, big enough to read
 * from arm's length (the old one was a faint grey outline). High contrast
 * swaps to black on yellow.
 */
export function SafeStar({ size, high }: { size: number; high: boolean }) {
  const badge = size * 0.78;
  return (
    <View
      pointerEvents="none"
      style={{
        width: badge,
        height: badge,
        borderRadius: badge,
        backgroundColor: high ? '#ffd54a' : '#ffffffb3',
        borderWidth: high ? 1.5 : 1,
        borderColor: high ? '#1e1b4b' : '#00000018',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.56,
          lineHeight: size * 0.7,
          color: high ? '#1e1b4b' : '#f59e0b',
          textShadowColor: high ? 'transparent' : '#7c450066',
          textShadowRadius: 1.5,
        }}
      >
        {'\u2605'}
      </Text>
    </View>
  );
}
