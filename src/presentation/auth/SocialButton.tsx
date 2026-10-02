import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import type { SocialProvider } from '@/domain';
import { makeStyles, useUi } from '../theme/AppearanceProvider';

/**
 * Brand colours, set by each provider's sign-in button guidelines and the
 * same in day and night: they are the brands', not the app's chrome.
 */
const BRAND: Record<
  SocialProvider,
  {
    bg: string;
    text: string;
    border: string;
    /** Border on a light page, where the night border would vanish. */
    dayBorder: string;
    badgeBg: string;
    badgeFg: string;
    letter: string;
  }
> = {
  google: {
    bg: '#ffffff',
    text: '#1f1f1f',
    border: '#dadce0',
    // Google's light-theme button stroke.
    dayBorder: '#747775',
    badgeBg: '#ffffff',
    badgeFg: '#4285f4',
    letter: 'G',
  },
  facebook: {
    bg: '#1877f2',
    text: '#ffffff',
    border: '#1877f2',
    dayBorder: '#1877f2',
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
  const { t } = useTranslation('account');
  const s = useStyles();
  const ui = useUi();
  const brand = BRAND[provider];
  const label = t(`social.${provider}`);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      // Darkens either brand fill on press.
      android_ripple={{ color: '#00000018' }}
      style={({ pressed }) => [
        s.base,
        {
          backgroundColor: brand.bg,
          borderColor: ui.scheme === 'dark' ? brand.border : brand.dayBorder,
          opacity: disabled ? 0.5 : 1,
        },
        pressed && s.pressed,
      ]}
    >
      <View style={[s.badge, { backgroundColor: brand.badgeBg }]}>
        <Text style={[s.badgeText, { color: brand.badgeFg }]}>{brand.letter}</Text>
      </View>
      <Text style={[s.label, { color: brand.text }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((ui) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    boxShadow: `0 2px 8px ${ui.shadow}`,
  },
  pressed: { transform: [{ translateY: 1 }], opacity: 0.92 },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 1px 2px ${ui.shadow}`,
  },
  badgeText: { fontSize: 15, fontWeight: '900' },
  label: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
}));
