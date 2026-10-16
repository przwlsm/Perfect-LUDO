import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { ThemeChoice } from '@/domain/entities/Settings';
import { rewardedAds } from '@/config/container';
import { AppText, Card, Pressy, Segmented, Toggle, type IconName } from '../components/Kit';
import { Page } from '../components/Page';
import { VoiceCard } from '../components/VoiceCard';
import { LANGUAGES } from '../i18n';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

export function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, update, calmMotion } = useSettings();
  const { restore } = useEntitlements();
  const [adPrivacy, setAdPrivacy] = useState(false);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void rewardedAds.privacyOptionsRequired().then((required) => {
      if (live) setAdPrivacy(required);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <Page title={t('settings.title')}>
      <Card style={styles.group}>
        <Toggle
          label={t('settings.sound')}
          value={settings.sound}
          onChange={(sound) => update({ sound })}
        />
        <Toggle
          label={t('settings.haptics')}
          value={settings.haptics}
          onChange={(haptics) => update({ haptics })}
        />
        <Toggle
          label={t('settings.motion')}
          hint={t('settings.motionHint')}
          value={calmMotion}
          onChange={(reduceMotion) => update({ reduceMotion })}
        />
      </Card>

      <Card style={styles.group}>
        <AppText variant="label">{t('settings.light')}</AppText>
        <Segmented<ThemeChoice>
          label={t('settings.light')}
          value={settings.theme}
          onChange={(theme) => update({ theme })}
          options={(['system', 'night', 'day'] as const).map((v) => ({
            value: v,
            label: t(`settings.lights.${v}`),
          }))}
        />
        {LANGUAGES.length > 1 && (
          <>
            <AppText variant="label">{t('settings.language')}</AppText>
            <Segmented<string>
              label={t('settings.language')}
              value={settings.language ?? 'device'}
              onChange={(code) => update({ language: code === 'device' ? null : code })}
              options={[
                { value: 'device', label: t('settings.languageDevice') },
                ...LANGUAGES.map((l) => ({ value: l.code as string, label: l.name as string })),
              ]}
            />
          </>
        )}
      </Card>

      <VoiceCard title={t('settings.voice')} />

      <Card style={styles.links}>
        <Row icon="color-palette-outline" label={t('settings.looks')} href="/looks" />
        <Row icon="book-outline" label={t('settings.how')} href="/how" />
        <Row icon="heart-outline" label={t('settings.support')} href="/support" />
        <Row icon="shield-checkmark-outline" label={t('settings.money')} href="/money" />
        <Row icon="document-text-outline" label={t('settings.privacy')} href="/privacy" />
        <Row
          icon="refresh-outline"
          label={t('settings.restore')}
          onPress={() =>
            void restore().then((found) =>
              setRestoreNote(found ? t('support.restored') : t('support.nothingToRestore')),
            )
          }
        />
        {adPrivacy && (
          <Row
            icon="options-outline"
            label={t('settings.adPrivacy')}
            onPress={() => void rewardedAds.showPrivacyOptions()}
          />
        )}
      </Card>
      {restoreNote && (
        <AppText variant="caption" center accessibilityLiveRegion="polite">
          {restoreNote}
        </AppText>
      )}

      <AppText variant="caption" center>
        {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
      </AppText>
      <AppText variant="caption" center color={theme.muted}>
        {t('settings.credits')}
      </AppText>
    </Page>
  );
}

function Row({
  icon,
  label,
  href,
  onPress,
}: {
  icon: IconName;
  label: string;
  href?: Href;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressy
      onPress={() => (href ? router.push(href) : onPress?.())}
      accessibilityLabel={label}
      style={styles.row}
    >
      <Ionicons name={icon} size={22} color={theme.accentText} />
      <AppText variant="heading" style={styles.flex}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={theme.faint} />
    </Pressy>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12 },
  flex: { flex: 1 },
  links: { paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
});
