import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import type { SocialProvider } from '@/domain';

const BRAND: Record<
  SocialProvider,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeFg: string;
    letter: string;
  }
> = {
  google: {
    label: 'Continue with Google',
    bg: '#ffffff',
    text: '#1f1f1f',
    border: '#dadce0',
    badgeBg: '#ffffff',
    badgeFg: '#4285f4',
    letter: 'G',
  },
  facebook: {
    label: 'Continue with Facebook',
    bg: '#1877f2',
    text: '#ffffff',
    border: '#1877f2',
    badgeBg: '#ffffff',
    badgeFg: '#1877f2',
    letter: 'f',
  },
};

export function SocialButton({
  provider,
  disabled,
  onPress,
}: {
  provider: SocialProvider;
  disabled?: boolean;
  onPress(): void;
}) {
  const brand = BRAND[provider];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={brand.label}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: '#00000018' }}
      style={({ pressed }) => [
        s.base,
        {
          backgroundColor: brand.bg,
          borderColor: brand.border,
          opacity: disabled ? 0.5 : 1,
        },
        pressed && s.pressed,
      ]}
    >
      <View style={[s.badge, { backgroundColor: brand.badgeBg }]}>
        <Text style={[s.badgeText, { color: brand.badgeFg }]}>{brand.letter}</Text>
      </View>
      <Text style={[s.label, { color: brand.text }]}>{brand.label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    boxShadow: '0 2px 8px #00000030',
  },
  pressed: { transform: [{ translateY: 1 }], opacity: 0.92 },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 2px #00000020',
  },
  badgeText: { fontSize: 15, fontWeight: '900' },
  label: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
});
