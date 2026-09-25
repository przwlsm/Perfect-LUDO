import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { NotificationBell } from '../social/NotificationBell';
import { getCardDesign, ui } from '../theme/themes';

export function Label({ children, color = ui.muted }: { children: ReactNode; color?: string }) {
  return <Text style={[s.label, { color }]}>{children}</Text>;
}
export function Title({ children }: { children: ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}
export function Body({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={style}>
      <Text style={s.body}>{children}</Text>
    </View>
  );
}
export function Button({
  children,
  onPress,
  secondary,
  disabled,
  compact,
}: {
  children: ReactNode;
  onPress(): void;
  secondary?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { theme } = useProfile();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: secondary ? '#ffffff30' : '#00000025' }}
      style={({ pressed }) => [
        s.button,
        secondary
          ? {
              backgroundColor: '#ffffff12',
              borderWidth: 1.5,
              borderColor: '#ffffff28',
              borderBottomWidth: 3,
              borderBottomColor: '#00000035',
            }
          : {
              backgroundColor: theme.accent,
              borderBottomWidth: 4,
              borderBottomColor: '#00000045',
              boxShadow: `0 6px 16px ${theme.accent}4a`,
            },
        { opacity: disabled ? 0.45 : 1 },
        compact && { paddingVertical: 10, minHeight: 44 },
        pressed && {
          transform: [{ translateY: secondary ? 1 : 2 }],
          borderBottomWidth: secondary ? 1 : 2,
        },
      ]}
    >
      <Text style={[s.buttonText, { color: secondary ? ui.text : '#251b13' }]}>{children}</Text>
    </Pressable>
  );
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { theme, profile } = useProfile();
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
export function CoinPill() {
  const { profile, member, wallet, refreshWallet } = useProfile();
  if (!member)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign in to use coins"
        onPress={() => router.push({ pathname: '/login', params: { intent: 'store' } })}
        android_ripple={{ color: '#ffc56840' }}
        style={s.coins}
      >
        <Text style={s.coinText}>◉ Sign in</Text>
        <Text style={s.coinPlus}>+</Text>
      </Pressable>
    );
  if (wallet !== 'ready')
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Coins could not be loaded. Retry"
        onPress={() => void refreshWallet()}
        android_ripple={{ color: '#ffc56840' }}
        style={s.coins}
      >
        <Text style={s.coinText}>◉ —</Text>
        <Text style={s.coinPlus}>↻</Text>
      </Pressable>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${profile.coins} coins. Open store`}
      onPress={() => router.push('/store')}
      android_ripple={{ color: '#ffc56840' }}
      style={s.coins}
    >
      <Text style={s.coinText}>◉ {profile.coins.toLocaleString()}</Text>
      <Text style={s.coinPlus}>+</Text>
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
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  nav?: boolean;
  back?: boolean;
  immersive?: boolean;
}) {
  const { theme, ready, error, reload } = useProfile();
  const { width, height, fontScale } = useWindowDimensions();
  const compactHeader = width / fontScale < 390;
  // Landscape on a phone leaves little height; tighten the chrome so more
  // of each screen's content is on screen without scrolling.
  const landscape = width > height;
  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.background }]}>
      {!immersive && (
        <View style={[s.header, landscape && { paddingVertical: 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={back ? 'Back' : 'Ludo Club home'}
            onPress={() => (back && router.canGoBack() ? router.back() : router.replace('/'))}
            android_ripple={{ color: '#ffffff1f' }}
            style={s.brand}
          >
            <View style={[s.brandMark, { backgroundColor: theme.accent }]}>
              <Text style={s.brandDie}>{back ? '‹' : '⚄'}</Text>
            </View>
            {!compactHeader && (
              <View>
                <Text style={s.brandText}>
                  LUDO<Text style={{ color: theme.accent }}> CLUB</Text>
                </Text>
                <Text style={s.brandSub}>GOOD TIMES. GREAT MOVES.</Text>
              </View>
            )}
          </Pressable>
          <View style={s.headerActions}>
            <NotificationBell />
            <CoinPill />
          </View>
        </View>
      )}
      {!ready ? (
        <View style={s.loading}>
          {error ? (
            <>
              <Body>{error}</Body>
              <Button onPress={() => void reload()}>Retry loading</Button>
            </>
          ) : (
            <ActivityIndicator color={theme.accent} />
          )}
        </View>
      ) : (
        <ScrollView
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
              <Label color={theme.accent}>{subtitle ?? 'MAKE YOUR NEXT MOVE'}</Label>
              <Title>{title}</Title>
            </View>
          )}
          {children}
        </ScrollView>
      )}
      {nav && <BottomNav compact={landscape} />}
    </SafeAreaView>
  );
}
function BottomNav({ compact }: { compact: boolean }) {
  const path = usePathname();
  const { theme } = useProfile();
  const { account } = useSocial();
  // Guests still reach Friends, where the account offer explains the lock.
  const locked = (href: string) => account === 'guest' && href === '/friends';
  return (
    <View style={[s.nav, { backgroundColor: theme.background }, compact && { paddingVertical: 4 }]}>
      {(
        [
          ['/', '⌂', 'Play'],
          ['/online', '◎', 'Online'],
          ['/friends', '⚈⚈', 'Friends'],
          ['/store', '▦', 'Store'],
          ['/profile', '♙', 'Profile'],
        ] as const
      ).map(([href, symbol, label]) => (
        <Pressable
          key={href}
          accessibilityRole="button"
          accessibilityLabel={locked(href) ? `${label}, account required` : label}
          accessibilityState={{ selected: path === href }}
          onPress={() => router.replace(href)}
          android_ripple={{ color: '#ffffff1f' }}
          style={s.navItem}
        >
          <Text style={[s.navIcon, { color: path === href ? theme.accent : ui.subtle }]}>
            {symbol}
          </Text>
          <Text style={[s.navText, { color: path === href ? theme.accent : ui.subtle }]}>
            {label}
            {locked(href) ? ' 🔒' : ''}
          </Text>
          {path === href && <View style={[s.navDot, { backgroundColor: theme.accent }]} />}
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View accessibilityViewIsModal style={[s.sheet, { backgroundColor: theme.background }]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={onClose}
              android_ripple={{ color: '#ffffff25' }}
              style={s.close}
            >
              <Text style={{ color: ui.muted, fontSize: 24 }}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 18 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export const shared = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  section: { gap: 14 },
  sectionTitle: { color: ui.text, fontSize: 19, fontWeight: '800' },
  small: { color: ui.muted, fontSize: 12, lineHeight: 18 },
  error: { color: ui.danger, fontSize: 13, lineHeight: 20 },
  selected: { borderColor: ui.gold, borderWidth: 1 },
});
const s = StyleSheet.create({
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
  brand: { minHeight: 44, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandMark: {
    width: 40,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#00000040',
  },
  brandDie: { fontSize: 30, color: '#29213a', lineHeight: 36 },
  brandText: { color: ui.text, fontWeight: '900', fontSize: 18, letterSpacing: 0.5 },
  brandSub: { color: ui.subtle, fontSize: 7, letterSpacing: 1.4, fontWeight: '700', marginTop: 3 },
  coins: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 6,
    minHeight: 44,
    backgroundColor: '#ffc56812',
    borderWidth: 1,
    borderColor: '#ffc56830',
    borderRadius: 20,
  },
  coinText: { color: ui.gold, fontWeight: '800', fontSize: 13 },
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
  title: { color: ui.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  body: { color: ui.muted, fontSize: 14, lineHeight: 22 },
  button: {
    minHeight: 54,
    borderRadius: 15,
    padding: 16,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    textAlign: 'center',
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  card: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: ui.line, gap: 14 },
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
  navIcon: { fontSize: 25, lineHeight: 28 },
  navText: { fontSize: 10, fontWeight: '700' },
  navDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  overlay: {
    flex: 1,
    backgroundColor: '#030612cc',
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
    borderColor: '#ffffff20',
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff08',
    borderRadius: 14,
  },
});
