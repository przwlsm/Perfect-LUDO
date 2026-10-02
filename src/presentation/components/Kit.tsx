import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { Text } from './AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { levelInfo } from '@/domain';
import { CoinIcon, GemIcon } from './Currency';
import { shade } from '../board/shade';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { NotificationBell } from '../social/NotificationBell';
import { LudoLoader } from './LudoLoader';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { getCardDesign } from '../theme/themes';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { readableOn } from '../theme/color';
import { useTranslation } from 'react-i18next';
import { numberLocale } from '../i18n/format';
import { mirrorInRtl } from '../i18n/rtl';
import { Doodles, type DoodleDensity } from './Doodles';

export function Label({ children, color }: { children: ReactNode; color?: string }) {
  const s = useStyles();
  const ui = useUi();
  return <Text style={[s.label, { color: color ?? ui.muted }]}>{children}</Text>;
}
export function Title({ children }: { children: ReactNode }) {
  const s = useStyles();
  return <Text style={s.title}>{children}</Text>;
}
export function Body({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const s = useStyles();
  return (
    <View style={style}>
      <Text style={s.body}>{children}</Text>
    </View>
  );
}
/**
 * Arcade buttons. Primary: a glossy gradient in the theme accent with a
 * thick darker rim underneath that collapses as it is pressed, like a
 * molded plastic arcade key. Secondary: raised navy slate.
 */
export function Button({
  children,
  onPress,
  secondary,
  danger,
  disabled,
  compact,
  fit,
}: {
  children: ReactNode;
  onPress(): void;
  secondary?: boolean;
  /** For a destructive, hard-to-undo action (e.g. deleting an account). */
  danger?: boolean;
  disabled?: boolean;
  compact?: boolean;
  /** Keep the label on one line, shrinking it slightly in longer languages. */
  fit?: boolean;
}) {
  const { theme } = useProfile();
  const s = useStyles();
  const ui = useUi();
  const accent = danger ? ui.danger : theme.accent;
  const radius = compact ? 14 : 16;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: secondary ? ui.ripple : '#00000022' }}
      style={({ pressed }) => [
        s.button,
        { borderRadius: radius, opacity: disabled ? 0.45 : 1 },
        secondary
          ? {
              borderWidth: 1,
              borderColor: danger ? `${ui.danger}55` : `${accent}45`,
              borderBottomWidth: pressed ? 1 : 3,
              borderBottomColor: danger ? ui.dangerSecondary[2] : ui.navyRim,
              boxShadow: `0 4px 14px ${ui.shadow}`,
            }
          : {
              borderBottomWidth: pressed ? 1 : 4,
              borderBottomColor: shade(accent, -0.5),
              boxShadow: `0 6px 18px ${accent}40`,
            },
        compact && { paddingVertical: 10, minHeight: 48 },
        pressed && { transform: [{ translateY: secondary ? 2 : 3 }] },
      ]}
    >
      <LinearGradient
        colors={
          secondary
            ? danger
              ? ui.dangerSecondary
              : ui.secondary
            : [shade(accent, 0.18), accent, shade(accent, -0.14)]
        }
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View style={[s.gloss, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
      <Text
        style={[
          s.buttonText,
          secondary
            ? { color: danger ? ui.danger : ui.secondaryText }
            : { color: shade(accent, -0.78), textTransform: 'uppercase', letterSpacing: 0.9 },
        ]}
        {...(fit ? { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.75 } : {})}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { theme, profile } = useProfile();
  const s = useStyles();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: theme.surface },
        profile.pack && getCardDesign(profile.pack),
        style,
      ]}
    >
      {children}
    </View>
  );
}
/**
 * The header wallet. Coins belong to an account, so a guest or signed-out
 * player is offered sign-in instead of a device number; a member whose
 * account could not be reached sees a reload instead of a stale balance.
 */
/** 1234 -> "1,234"; 125400 -> "125.4K": the header has little room. */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 100_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString(numberLocale());
}
/** The header pills stay 40 high to fit; this lifts their touch area to 48. */
const PILL_HIT_SLOP = { top: 4, bottom: 4 };
export function CoinPill() {
  const { profile, member, wallet, refreshWallet } = useProfile();
  const { t } = useTranslation();
  const s = useStyles();
  if (!member)
    // A guest's header shows the vault filling up; tapping it opens Rewards,
    // where the sign-in claim lives.
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('wallet.vaultA11y', { amount: profile.vaultCoins })}
        onPress={() => router.push('/rewards')}
        android_ripple={{ color: '#ffc56840' }}
        hitSlop={PILL_HIT_SLOP}
        style={s.coins}
      >
        <CoinIcon size={22} />
        <Text style={s.coinText}>{formatCount(profile.vaultCoins)}</Text>
        <Text style={[s.coinPlus, { fontSize: 11 }]}>🔒</Text>
      </Pressable>
    );
  if (wallet !== 'ready')
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('wallet.loadFailedA11y')}
        onPress={() => void refreshWallet()}
        android_ripple={{ color: '#ffc56840' }}
        hitSlop={PILL_HIT_SLOP}
        style={s.coins}
      >
        <CoinIcon size={22} />
        <Text style={s.coinText}>—</Text>
        <Text style={s.coinPlus}>↻</Text>
      </Pressable>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('wallet.coinsA11y', { amount: profile.coins })}
      onPress={() => router.push('/store')}
      android_ripple={{ color: '#ffc56840' }}
      hitSlop={PILL_HIT_SLOP}
      style={s.coins}
    >
      <CoinIcon size={22} />
      <Text style={s.coinText}>{formatCount(profile.coins)}</Text>
      <Text style={s.coinPlus}>+</Text>
    </Pressable>
  );
}
/** Gems, for members once the wallet has loaded; opens the rewards page. */
export function GemPill() {
  const { profile, member, wallet } = useProfile();
  const { t } = useTranslation();
  const s = useStyles();
  if (!member || wallet !== 'ready') return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('wallet.gemsA11y', { amount: profile.gems })}
      onPress={() => router.push('/rewards')}
      android_ripple={{ color: '#c084fc40' }}
      hitSlop={PILL_HIT_SLOP}
      style={[s.coins, { paddingRight: 12, gap: 6 }]}
    >
      <GemIcon size={20} />
      <Text style={s.coinText}>{formatCount(profile.gems)}</Text>
    </Pressable>
  );
}
export function Screen({
  children,
  title,
  subtitle,
  nav = true,
  back = false,
  immersive = false,
  decor = 'full',
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  nav?: boolean;
  back?: boolean;
  immersive?: boolean;
  /** The faint doodle wallpaper behind the page: full, light, or none. */
  decor?: DoodleDensity | 'none';
}) {
  const { theme, ready, error, reload, member, wallet, profile } = useProfile();
  const { t } = useTranslation();
  const s = useStyles();
  const ui = useUi();
  const loaderMotion = useMotionEnabled(profile.reducedMotion, !ready);
  const level = member && wallet === 'ready' ? levelInfo(profile.xp).level : null;
  const { width, height, fontScale } = useWindowDimensions();
  // Insets come from the provider, already known on the first frame. The
  // native SafeAreaView measures them itself after mounting, so a freshly
  // opened tab drew one frame without them and then jumped into place.
  const insets = useSafeAreaInsets();
  // Set by the bottom bar: which side the tapped tab sits on.
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const entering =
    tab === 'left'
      ? FadeInLeft.duration(260)
      : tab === 'right'
        ? FadeInRight.duration(260)
        : undefined;
  // The gem pill takes room; drop the brand words sooner so nothing overlaps.
  const compactHeader = width / fontScale < (level !== null ? 440 : 390);
  // Landscape on a phone leaves little height; tighten the chrome so more
  // of each screen's content is on screen without scrolling.
  const landscape = width > height;
  // The wordmark is large bold text, legible at 3:1, so it keeps a richer gold by day.
  const brandGold =
    ui.scheme === 'dark' ? theme.accentText : readableOn(theme.accent, [theme.background], 3);
  return (
    <View
      style={[
        s.screen,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {decor !== 'none' && <Doodles density={decor} />}
      {!immersive && (
        <View style={[s.header, landscape && { paddingVertical: 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={back ? t('actions.back') : t('brand.homeA11y')}
            onPress={() => (back && router.canGoBack() ? router.back() : router.replace('/'))}
            android_ripple={{ color: ui.ripple }}
            style={s.brand}
          >
            <View style={[s.brandMark, { backgroundColor: theme.accent }]}>
              <Text style={[s.brandDie, back && mirrorInRtl]}>{back ? '‹' : '⚄'}</Text>
              {level !== null && !back && (
                <View
                  accessibilityLabel={t('wallet.levelA11y', { level })}
                  style={[s.levelBadge, { borderColor: theme.background }]}
                >
                  <Text style={s.levelText}>{level}</Text>
                </View>
              )}
            </View>
            {!compactHeader && (
              <View>
                <Text style={s.brandText}>
                  LUDO<Text style={{ color: brandGold }}> RUMBLE</Text>
                </Text>
                <Text style={s.brandSub}>{t('brand.tagline')}</Text>
              </View>
            )}
          </Pressable>
          <View style={s.headerActions}>
            <NotificationBell />
            <GemPill />
            <CoinPill />
          </View>
        </View>
      )}
      {!ready ? (
        <View style={s.loading}>
          {error ? (
            <>
              <Body>{error}</Body>
              <Button onPress={() => void reload()}>{t('actions.retryLoading')}</Button>
            </>
          ) : (
            <LudoLoader motionEnabled={loaderMotion} />
          )}
        </View>
      ) : (
        // Keyboard-aware: whichever field is being typed in is scrolled up
        // above the keyboard, on every page that uses Screen.
        <Animated.View entering={entering} style={{ flex: 1 }}>
          <KeyboardAwareScrollView
            bottomOffset={24}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              s.content,
              immersive && { paddingHorizontal: 8, paddingTop: 8 },
              landscape && { paddingTop: 0, gap: 18 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {title && (
              <View style={s.heading}>
                <Label color={theme.accentText}>{subtitle ?? t('brand.defaultSubtitle')}</Label>
                <Title>{title}</Title>
              </View>
            )}
            {children}
          </KeyboardAwareScrollView>
        </Animated.View>
      )}
      {nav && <BottomNav compact={landscape} />}
    </View>
  );
}
function BottomNav({ compact }: { compact: boolean }) {
  const path = usePathname();
  const { theme } = useProfile();
  const { account } = useSocial();
  const { t } = useTranslation();
  const s = useStyles();
  const ui = useUi();
  // By day the active tab is a navy pill with a gold icon (the 30% / 10% of 60-30-10).
  const day = ui.scheme === 'light';
  // Guests still reach Friends, where the account offer explains the lock.
  const locked = (href: string) => account === 'guest' && href === '/friends';
  const tabs = [
    ['/', 'game-controller', t('nav.play')],
    ['/online', 'globe', t('nav.online')],
    ['/rewards', 'gift', t('nav.rewards')],
    ['/friends', 'people', t('nav.friends')],
    ['/profile', 'person-circle', t('nav.profile')],
  ] as const;
  const here = tabs.findIndex(([href]) => href === path);
  /** Slides the next tab in from the side it sits on, like native tabs. */
  function open(href: (typeof tabs)[number][0], index: number) {
    if (href === path) return;
    router.replace({ pathname: href, params: { tab: index < here ? 'left' : 'right' } });
  }
  return (
    <View style={[s.nav, { backgroundColor: theme.background }, compact && { paddingVertical: 4 }]}>
      {tabs.map(([href, symbol, label], index) => (
        <Pressable
          key={href}
          accessibilityRole="button"
          accessibilityLabel={locked(href) ? t('nav.accountRequired', { label }) : label}
          accessibilityState={{ selected: path === href }}
          onPress={() => open(href, index)}
          android_ripple={{ color: ui.ripple }}
          style={s.navItem}
        >
          <View
            style={[
              s.navIconWrap,
              path === href && { backgroundColor: day ? ui.navy : `${theme.accent}22` },
            ]}
          >
            <Ionicons
              name={path === href ? symbol : (`${symbol}-outline` as typeof symbol)}
              size={23}
              color={path === href ? (day ? theme.accent : theme.accentText) : ui.subtle}
            />
          </View>
          <Text
            style={[
              s.navText,
              { color: path === href ? (day ? ui.text : theme.accentText) : ui.subtle },
            ]}
          >
            {label}
            {locked(href) ? ' 🔒' : ''}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
}) {
  const { theme } = useProfile();
  const { t } = useTranslation();
  const s = useStyles();
  const ui = useUi();
  const insets = useSafeAreaInsets();
  return (
    // Translucent bars so the dialog draws edge to edge like the rest of the
    // app; that is also what lets the keyboard controller see the keyboard
    // inside this separate Android window.
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* The dialog shrinks to the space above the keyboard, and its content
          scrolls the focused field into view. */}
      <KeyboardAvoidingView
        behavior="padding"
        style={[s.overlay, { paddingTop: 20 + insets.top, paddingBottom: 20 + insets.bottom }]}
      >
        <View accessibilityViewIsModal style={[s.sheet, { backgroundColor: theme.background }]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('actions.closeDialog')}
              onPress={onClose}
              android_ripple={{ color: ui.ripple }}
              style={s.close}
            >
              <Text style={{ color: ui.muted, fontSize: 24 }}>×</Text>
            </Pressable>
          </View>
          <KeyboardAwareScrollView
            bottomOffset={16}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 18 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </KeyboardAwareScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
/** Layout and text styles shared by every screen, in the current day/night colours. */
export const useShared = makeStyles((ui) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  section: { gap: 14 },
  sectionTitle: { color: ui.text, fontSize: 20, fontWeight: '700', lineHeight: 26 },
  small: { color: ui.muted, fontSize: 12, lineHeight: 18 },
  error: { color: ui.danger, fontSize: 13, lineHeight: 20 },
  selected: { borderColor: ui.gold, borderWidth: 1 },
}));
const useStyles = makeStyles((ui) => ({
  screen: { flex: 1 },
  header: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  brand: { minHeight: 48, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  levelBadge: {
    position: 'absolute',
    right: -7,
    bottom: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: ui.blue,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: { color: ui.onColor, fontSize: 10, fontWeight: '900', lineHeight: 13 },
  brandMark: {
    width: 40,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: ui.shadow,
  },
  brandDie: { fontSize: 30, color: '#29213a', lineHeight: 36 },
  brandText: { color: ui.text, fontWeight: '900', fontSize: 18, letterSpacing: 0.5 },
  brandSub: { color: ui.subtle, fontSize: 7, letterSpacing: 1.4, fontWeight: '700', marginTop: 3 },
  coins: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 5,
    minHeight: 40,
    backgroundColor: ui.surfaceLow,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: 999,
  },

  coinText: { color: ui.text, fontWeight: '800', fontSize: 14 },
  coinPlus: {
    color: '#1d2030',
    backgroundColor: ui.gold,
    width: 23,
    height: 23,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 22,
  },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
    gap: 26,
  },
  heading: { gap: 8, marginTop: 8 },
  title: {
    color: ui.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 38,
    textShadowColor: ui.scheme === 'dark' ? '#00000080' : 'transparent',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  body: { color: ui.muted, fontSize: 14, lineHeight: 21 },
  button: {
    minHeight: 56,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: '#ffffff66',
  },
  buttonText: {
    textAlign: 'center',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: ui.line,
    gap: 14,
    boxShadow: `0 8px 24px ${ui.shadow}`,
  },
  nav: {
    borderTopWidth: 1,
    borderColor: ui.line,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  navItem: { flex: 1, minHeight: 52, alignItems: 'center', gap: 3 },
  navIconWrap: {
    width: 52,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { fontSize: 11, fontWeight: '700' },
  navDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  overlay: {
    flex: 1,
    backgroundColor: ui.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '88%',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: ui.border,
    padding: 24,
    gap: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sheetTitle: { fontSize: 22, color: ui.text, fontWeight: '800', flex: 1 },
  close: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.fill,
    borderRadius: 14,
  },
}));
