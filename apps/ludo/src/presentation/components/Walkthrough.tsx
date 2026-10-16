import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { preferencesStore } from '@/config/container';
import { Text } from './AppText';
import { Button } from './Kit';
import { useProfile } from '../state/ProfileProvider';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { shade } from '../board/shade';
import { PREFERENCE_KEYS } from '../preferenceKeys';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { DARK } from '../theme/palette';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * One idea per page, in the four player colours of the board (text: onboarding:pages.<id>).
 * The badges are art: the same bright colours in day and night, with a dark glyph.
 */
const PAGES: readonly {
  id: 'roll' | 'race' | 'capture' | 'modes';
  icon: IconName;
  color: string;
}[] = [
  { id: 'roll', icon: 'dice', color: DARK.danger },
  { id: 'race', icon: 'flag', color: DARK.green },
  { id: 'capture', icon: 'flash', color: DARK.blue },
  { id: 'modes', icon: 'people', color: DARK.gold },
];

/** A short, skippable tour of the rules and ways to play. */
export function Walkthrough({ visible, onDone }: { visible: boolean; onDone(): void }) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onDone}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* Mounted only while open, so it always starts on the first page. */}
      {visible && <Pages onDone={onDone} />}
    </Modal>
  );
}

function Pages({ onDone }: { onDone(): void }) {
  const { theme, profile } = useProfile();
  const { t } = useTranslation(['onboarding', 'common']);
  const s = useStyles();
  const ui = useUi();
  const insets = useSafeAreaInsets();
  const motion = useMotionEnabled(profile.reducedMotion, true);
  const [index, setIndex] = useState(0);
  const page = PAGES[index];
  const last = index === PAGES.length - 1;
  if (!page) return null;

  return (
    <View
      accessibilityViewIsModal
      style={[
        s.screen,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      <View style={s.top}>
        <Text style={s.step}>{t('step', { current: index + 1, total: PAGES.length })}</Text>
        {!last && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('skipA11y')}
            onPress={onDone}
            android_ripple={{ color: ui.ripple }}
            style={s.skip}
          >
            <Text style={s.skipText}>{t('skip')}</Text>
          </Pressable>
        )}
      </View>

      <Animated.View
        key={index}
        entering={motion ? FadeIn.duration(260) : undefined}
        style={s.body}
        accessibilityLiveRegion="polite"
      >
        <View
          style={[
            s.badge,
            { backgroundColor: page.color, borderBottomColor: shade(page.color, -0.5) },
          ]}
        >
          <Ionicons name={page.icon} size={56} color={shade(page.color, -0.78)} />
        </View>
        <Text accessibilityRole="header" style={s.title}>
          {t(`pages.${page.id}.title`)}
        </Text>
        <Text style={s.text}>{t(`pages.${page.id}.text`)}</Text>
      </Animated.View>

      <View style={s.footer}>
        <View
          style={s.dots}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {PAGES.map((p, i) => (
            <View
              key={p.id}
              style={[s.dot, i === index && { width: 22, backgroundColor: theme.accent }]}
            />
          ))}
        </View>
        <Button onPress={() => (last ? onDone() : setIndex(index + 1))}>
          {last ? t('start') : t('next')}
        </Button>
        {index > 0 && (
          <Button secondary compact onPress={() => setIndex(index - 1)}>
            {t('common:actions.back')}
          </Button>
        )}
      </View>
    </View>
  );
}

/** Opens the walkthrough once, on a player's first launch. */
export function FirstRunWalkthrough() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    void preferencesStore
      .getItem(PREFERENCE_KEYS.WALKTHROUGH_DONE)
      .then((done) => setOpen(done !== 'true'))
      .catch(() => undefined);
  }, []);
  return (
    <Walkthrough
      visible={open}
      onDone={() => {
        setOpen(false);
        void preferencesStore
          .setItem(PREFERENCE_KEYS.WALKTHROUGH_DONE, 'true')
          .catch(() => undefined);
      }}
    />
  );
}

const useStyles = makeStyles((ui) => ({
  screen: { flex: 1, paddingHorizontal: 24 },
  top: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  step: { color: ui.subtle, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  skip: {
    minHeight: 48,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  skipText: { color: ui.muted, fontSize: 15, fontWeight: '700' },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  badge: {
    width: 112,
    height: 118,
    borderRadius: 32,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    // A deep drop for night; day uses the palette's softer shadow.
    boxShadow: `0 14px 34px ${ui.scheme === 'dark' ? '#00000066' : ui.shadow}`,
  },
  title: {
    color: ui.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 36,
    textAlign: 'center',
  },
  text: { color: ui.muted, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  footer: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ui.border },
}));
