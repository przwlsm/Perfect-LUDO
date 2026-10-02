import { useState } from 'react';
import { Modal, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from './AppText';
import { Body, Button, Label, Sheet, useShared } from './Kit';
import { useAppUpdate } from '../state/AppUpdateProvider';
import { useProfile } from '../state/ProfileProvider';
import { shade } from '../board/shade';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { mirrorInRtl } from '../i18n/rtl';

/** Routes where a restart would cost the player a match in progress. */
const IN_PLAY = /^\/(game|lobby|join)(\/|$)/;

/**
 * Rendered above the navigator. Shows, in order of priority:
 *  1. a blocking screen when this store version is no longer supported;
 *  2. a dismissible offer when a newer store version exists;
 *  3. an "update ready" popup once an over-the-air update has downloaded.
 */
export function AppUpdateGate() {
  const { requirement, offerStoreUpdate, otaReady } = useAppUpdate();
  if (requirement === 'REQUIRED') return <UpdateRequired />;
  return (
    <>
      <UpdateOffer visible={offerStoreUpdate} />
      {otaReady && <UpdateReadyDialog />}
    </>
  );
}

function VersionChips({ from, to }: { from: string | null; to: string | null }) {
  const { theme } = useProfile();
  const { t } = useTranslation(['system', 'common']);
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
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
        <Text style={[s.chipLabel, { color: theme.accentText }]}>{t('update.new')}</Text>
        <Text style={s.chipValue}>{to}</Text>
      </View>
    </View>
  );
}

function StoreHint() {
  const { t } = useTranslation(['system', 'common']);
  const shared = useShared();
  return <Text style={[shared.small, { textAlign: 'center' }]}>{t('update.appStoreHint')}</Text>;
}

function UpdateRequired() {
  const { installedVersion, policy, openStore, recheckStore } = useAppUpdate();
  const { theme } = useProfile();
  const { t } = useTranslation(['system', 'common']);
  const s = useStyles();
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
            <Label color={theme.accentText}>{t('update.required.label')}</Label>
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

/**
 * A downloaded over-the-air update, offered as a popup the first time the
 * player is somewhere safe to restart: never during a match (it waits until
 * they leave the table). "Later" keeps playing; the update still applies by
 * itself at the next launch.
 */
function UpdateReadyDialog() {
  const { applyOta } = useAppUpdate();
  const { theme } = useProfile();
  const { t } = useTranslation(['system', 'common']);
  const s = useStyles();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const visible = !dismissed && !IN_PLAY.test(pathname);

  return (
    <Sheet visible={visible} onClose={() => setDismissed(true)} title={t('update.ready.title')}>
      <View style={s.readyBody} accessibilityLiveRegion="polite">
        <View style={[s.readyBadge, { backgroundColor: `${theme.accent}22` }]}>
          <Ionicons name="sparkles" size={34} color={theme.accentText} />
        </View>
        <Body>{t('update.ready.body')}</Body>
      </View>
      <Button
        disabled={restarting}
        onPress={() => {
          setRestarting(true);
          void applyOta().finally(() => setRestarting(false));
        }}
      >
        {t('update.ready.restart')}
      </Button>
      <Button secondary compact onPress={() => setDismissed(true)}>
        {t('common:actions.later')}
      </Button>
    </Sheet>
  );
}

const useStyles = makeStyles((ui) => ({
  readyBody: { alignItems: 'center', gap: 14 },
  readyBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    // A deep drop for night; day uses the palette's softer shadow.
    boxShadow: `0 12px 30px ${ui.scheme === 'dark' ? '#00000066' : ui.shadow}`,
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
    boxShadow: `0 12px 30px ${ui.scheme === 'dark' ? '#00000070' : ui.shadow}`,
  },
}));
