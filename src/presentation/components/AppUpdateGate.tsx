import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Text } from './AppText';
import { Body, Button, Label, Sheet, shared } from './Kit';
import { useAppUpdate } from '../state/AppUpdateProvider';
import { useProfile } from '../state/ProfileProvider';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { shade } from '../board/shade';
import { ui } from '../theme/themes';
import { mirrorInRtl } from '../i18n/rtl';

/** Routes where a restart would cost the player a match in progress. */
const IN_PLAY = /^\/(game|lobby|join)(\/|$)/;

/**
 * Rendered above the navigator. Shows, in order of priority:
 *  1. a blocking screen when this store version is no longer supported;
 *  2. a dismissible offer when a newer store version exists;
 *  3. a "restart to update" toast once an over-the-air update has downloaded.
 */
export function AppUpdateGate() {
  const { requirement, offerStoreUpdate, otaReady } = useAppUpdate();
  if (requirement === 'REQUIRED') return <UpdateRequired />;
  return (
    <>
      <UpdateOffer visible={offerStoreUpdate} />
      {otaReady && <RestartToast />}
    </>
  );
}

function VersionChips({ from, to }: { from: string | null; to: string | null }) {
  const { theme } = useProfile();
  const { t } = useTranslation(['system', 'common']);
  if (!from || !to) return null;
  return (
    <View
      accessible
      accessibilityLabel={t('update.versionsA11y', { from, to })}
      style={[shared.row, { justifyContent: 'center' }]}
    >
      <View style={s.chip}>
        <Text style={s.chipLabel}>{t('update.installed')}</Text>
        <Text style={s.chipValue}>{from}</Text>
      </View>
      <Ionicons name="arrow-forward" size={18} color={ui.subtle} style={mirrorInRtl} />
      <View
        style={[s.chip, { borderColor: `${theme.accent}66`, backgroundColor: `${theme.accent}14` }]}
      >
        <Text style={[s.chipLabel, { color: theme.accent }]}>{t('update.new')}</Text>
        <Text style={s.chipValue}>{to}</Text>
      </View>
    </View>
  );
}

function StoreHint() {
  const { t } = useTranslation(['system', 'common']);
  return <Text style={[shared.small, { textAlign: 'center' }]}>{t('update.appStoreHint')}</Text>;
}

function UpdateRequired() {
  const { installedVersion, policy, openStore, recheckStore } = useAppUpdate();
  const { theme } = useProfile();
  const { t } = useTranslation(['system', 'common']);
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);

  async function checkAgain() {
    setChecking(true);
    try {
      await recheckStore();
    } finally {
      setChecking(false);
    }
  }

  return (
    // No way to close it: the back button is swallowed on purpose.
    <Modal
      visible
      transparent={false}
      animationType="fade"
      onRequestClose={() => undefined}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View
        accessibilityViewIsModal
        style={[
          s.blocker,
          {
            backgroundColor: theme.background,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={s.blockerBody}>
          <View
            style={[
              s.badge,
              { backgroundColor: theme.accent, borderBottomColor: shade(theme.accent, -0.5) },
            ]}
          >
            <Ionicons name="arrow-up" size={44} color={shade(theme.accent, -0.78)} />
          </View>
          <View style={{ gap: 10, alignItems: 'center' }}>
            <Label color={theme.accent}>{t('update.required.label')}</Label>
            <Text accessibilityRole="header" style={s.blockerTitle}>
              {t('update.required.title')}
            </Text>
            <Text style={s.blockerText}>{policy?.message ?? t('update.required.body')}</Text>
          </View>
          <VersionChips
            from={installedVersion}
            to={policy?.latestVersion ?? policy?.minVersion ?? null}
          />
        </View>
        <View style={s.blockerActions}>
          {openStore ? (
            <Button onPress={() => void openStore()}>{t('update.required.updateNow')}</Button>
          ) : (
            <StoreHint />
          )}
          <Button secondary compact disabled={checking} onPress={() => void checkAgain()}>
            {checking ? t('update.required.checking') : t('update.required.checkAgain')}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

function UpdateOffer({ visible }: { visible: boolean }) {
  const { installedVersion, policy, openStore, dismissStoreUpdate } = useAppUpdate();
  const { t } = useTranslation(['system', 'common']);
  return (
    <Sheet visible={visible} onClose={dismissStoreUpdate} title={t('update.offer.title')}>
      <Body>{policy?.message ?? t('update.offer.body')}</Body>
      <VersionChips from={installedVersion} to={policy?.latestVersion ?? null} />
      {openStore ? (
        <Button
          onPress={() => {
            dismissStoreUpdate();
            void openStore();
          }}
        >
          {t('update.offer.update')}
        </Button>
      ) : (
        <StoreHint />
      )}
      <Button secondary compact onPress={dismissStoreUpdate}>
        {t('common:actions.notNow')}
      </Button>
    </Sheet>
  );
}

function RestartToast() {
  const { applyOta } = useAppUpdate();
  const { theme, profile } = useProfile();
  const { t } = useTranslation(['system', 'common']);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const motion = useMotionEnabled(profile.reducedMotion, true);
  const [hidden, setHidden] = useState(false);
  const [restarting, setRestarting] = useState(false);
  // Never interrupt a match; the update also applies on its own next launch.
  if (hidden || IN_PLAY.test(pathname)) return null;

  return (
    <View pointerEvents="box-none" style={[s.toastWrap, { paddingBottom: insets.bottom + 84 }]}>
      <Animated.View
        entering={motion ? FadeInDown.duration(280) : undefined}
        exiting={motion ? FadeOutDown.duration(200) : undefined}
        accessibilityLiveRegion="polite"
        style={[s.toast, { backgroundColor: theme.surface, borderColor: `${theme.accent}55` }]}
      >
        <View style={[s.toastIcon, { backgroundColor: `${theme.accent}22` }]}>
          <Ionicons name="sparkles" size={20} color={theme.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.toastTitle}>{t('update.ready.title')}</Text>
          <Text style={s.toastText}>{t('update.ready.body')}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common:actions.later')}
          onPress={() => setHidden(true)}
          android_ripple={{ color: '#ffffff25' }}
          style={s.toastLater}
        >
          <Text style={[s.toastAction, { color: ui.subtle }]}>{t('common:actions.later')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('update.ready.restartA11y')}
          disabled={restarting}
          onPress={() => {
            setRestarting(true);
            void applyOta().finally(() => setRestarting(false));
          }}
          android_ripple={{ color: '#00000025' }}
          style={[s.toastRestart, { backgroundColor: theme.accent, opacity: restarting ? 0.6 : 1 }]}
        >
          <Text style={[s.toastAction, { color: shade(theme.accent, -0.78) }]}>
            {t('update.ready.restart')}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  blocker: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  blockerBody: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  blockerTitle: {
    color: ui.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 36,
    textAlign: 'center',
  },
  blockerText: { color: ui.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  blockerActions: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 12 },
  badge: {
    width: 96,
    height: 100,
    borderRadius: 28,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 30px #00000066',
  },
  chip: {
    minWidth: 96,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.inset,
  },
  chipLabel: { color: ui.subtle, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  chipValue: { color: ui.text, fontSize: 18, fontWeight: '800' },
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 14,
    zIndex: 40,
  },
  toast: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingLeft: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    boxShadow: '0 12px 30px #00000070',
  },
  toastIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTitle: { color: ui.text, fontSize: 15, fontWeight: '800' },
  toastText: { color: ui.muted, fontSize: 12.5, lineHeight: 17 },
  toastLater: {
    minHeight: 48,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  toastRestart: {
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderBottomWidth: 3,
    borderBottomColor: '#00000040',
  },
  toastAction: { fontSize: 14, fontWeight: '800' },
});
