import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { mix } from 'app-kit';
import { Ball } from '../caller/Ball';
import { FestiveBackdrop } from '../components/Festive';
import { AppText, IconButton, Pressy, type IconName } from '../components/Kit';
import { useGame } from '../state/GameProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

export function HomeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { host, player } = useGame();
  const { settings, seeHint } = useSettings();
  const firstRun = !settings.hintsSeen.includes('home');
  const go = (href: Href) => {
    if (firstRun) seeHint('home');
    router.push(href);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <FestiveBackdrop />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.topBar}>
          <IconButton
            icon="settings-outline"
            label={t('home.settings')}
            onPress={() => go('/settings')}
          />
        </View>

        <View style={styles.hero}>
          <Balls />
          <AppText variant="hero" center accessibilityRole="header">
            {t('app.name')}
          </AppText>
          <AppText variant="body" center color={theme.muted}>
            {t('app.tagline')}
          </AppText>
        </View>

        {host && (
          <Resume
            icon="megaphone"
            title={t('home.resumeHost')}
            body={t('home.resumeHostBody', { code: host.code, count: host.called })}
            onPress={() => go('/host/caller')}
          />
        )}
        {player && (
          <Resume
            icon="grid"
            title={t('home.resumePlayer')}
            body={t('home.resumePlayerBody', { code: player.code, count: player.count })}
            onPress={() => go('/play')}
          />
        )}

        <View style={styles.actions}>
          <Action
            icon="megaphone"
            title={t('home.host')}
            hint={t('home.hostHint')}
            bg={theme.accent}
            fg={theme.onAccent}
            onPress={() => go('/host')}
          />
          <Action
            icon="enter"
            title={t('home.join')}
            hint={t('home.joinHint')}
            bg={theme.second}
            fg={theme.onSecond}
            onPress={() => go('/join')}
          />
          <Action
            icon="people"
            title={t('home.solo')}
            hint={t('home.soloHint')}
            bg={theme.surfaceRaised}
            fg={theme.text}
            onPress={() => go('/solo')}
          />
        </View>

        {firstRun && (
          <View
            style={[styles.hint, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
          >
            <Ionicons name="sparkles" size={18} color={theme.accentText} />
            <AppText variant="caption" color={theme.text} style={styles.flex}>
              {t('home.firstHint')}
            </AppText>
          </View>
        )}

        <View style={styles.tiles}>
          <Tile icon="book-outline" label={t('home.how')} onPress={() => go('/how')} />
          <Tile icon="print-outline" label={t('home.print')} onPress={() => go('/print')} />
          <Tile icon="color-palette-outline" label={t('home.looks')} onPress={() => go('/looks')} />
          <Tile icon="heart-outline" label={t('home.support')} onPress={() => go('/support')} />
        </View>

        <AppText variant="caption" center>
          {t('home.free')}
        </AppText>
      </ScrollView>
    </View>
  );
}

/** Three balls that bob gently over the title (still under calmer motion). */
function Balls() {
  return (
    <View style={styles.balls} accessible={false} importantForAccessibility="no-hide-descendants">
      <Bobbing delay={0} lift={10}>
        <Ball n={7} size={58} />
      </Bobbing>
      <Bobbing delay={260} lift={14}>
        <Ball n={22} size={84} />
      </Bobbing>
      <Bobbing delay={520} lift={9}>
        <Ball n={88} size={62} />
      </Bobbing>
    </View>
  );
}

function Bobbing({
  delay,
  lift,
  children,
}: {
  delay: number;
  lift: number;
  children: React.ReactNode;
}) {
  const { calmMotion } = useSettings();
  const y = useSharedValue(0);
  useEffect(() => {
    if (calmMotion) {
      y.set(0);
      return;
    }
    y.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-lift, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
        ),
      ),
    );
  }, [calmMotion, delay, lift, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

interface ActionProps {
  readonly icon: IconName;
  readonly title: string;
  readonly hint: string;
  readonly bg: string;
  readonly fg: string;
  readonly onPress: () => void;
}

function Action({ icon, title, hint, bg, fg, onPress }: ActionProps) {
  const theme = useTheme();
  return (
    <Pressy
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityHint={hint}
      style={[
        styles.action,
        {
          backgroundColor: bg,
          borderBottomColor: mix(bg, '#000000', 0.3),
          boxShadow: `0 10px 24px ${theme.shadow}`,
        },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: mix(bg, fg, 0.14) }]}>
        <Ionicons name={icon} size={26} color={fg} />
      </View>
      <View style={styles.flex}>
        <AppText variant="title" color={fg}>
          {title}
        </AppText>
        <AppText variant="caption" color={fg} style={styles.actionHint}>
          {hint}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={22} color={fg} />
    </Pressy>
  );
}

function Resume({
  icon,
  title,
  body,
  onPress,
}: {
  icon: IconName;
  title: string;
  body: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressy
      onPress={onPress}
      accessibilityLabel={`${title}. ${body}`}
      style={[styles.resume, { backgroundColor: theme.glass, borderColor: theme.accent }]}
    >
      <View style={[styles.live, { backgroundColor: theme.success }]} />
      <Ionicons name={icon} size={22} color={theme.accentText} />
      <View style={styles.flex}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption">{body}</AppText>
      </View>
      <Ionicons name="arrow-forward-circle" size={28} color={theme.accentText} />
    </Pressy>
  );
}

function Tile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressy
      onPress={onPress}
      accessibilityLabel={label}
      style={[styles.tile, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
    >
      <Ionicons name={icon} size={24} color={theme.accentText} />
      <AppText variant="heading" center style={styles.tileText}>
        {label}
      </AppText>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },
  topBar: { position: 'absolute', top: 8, right: 16, zIndex: 2 },
  hero: { alignItems: 'center', gap: 4, marginBottom: 8 },
  balls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    height: 112,
    marginBottom: 4,
  },
  actions: { gap: 12 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 88,
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 5,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHint: { opacity: 0.92 },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  live: { position: 'absolute', top: 10, left: 10, width: 8, height: 8, borderRadius: 4 },
  hint: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 76,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tileText: { fontSize: 15 },
  flex: { flex: 1 },
});
