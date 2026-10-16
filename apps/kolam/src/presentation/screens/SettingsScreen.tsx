import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { ThemeChoice } from '@/domain/entities/Settings';
import { rewardedAds } from '@/config/container';
import { AppText, Card, Pressy } from '../components/Kit';
import { Page } from '../components/Page';
import { LANGUAGES } from '../i18n';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

const LIGHTS: readonly ThemeChoice[] = ['system', 'dawn', 'courtyard'];

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
        <AppText variant="label">{t('settings.play')}</AppText>
        <Toggle
          label={t('settings.showErrors')}
          hint={t('settings.showErrorsHint')}
          value={settings.showErrors}
          onChange={(showErrors) => update({ showErrors })}
        />
        <Toggle
          label={t('settings.autoCross')}
          hint={t('settings.autoCrossHint')}
          value={settings.autoCross}
          onChange={(autoCross) => update({ autoCross })}
        />
        <Toggle
          label={t('settings.timer')}
          hint={t('settings.timerHint')}
          value={settings.timer}
          onChange={(timer) => update({ timer })}
        />
      </Card>

      <Card style={styles.group}>
        <AppText variant="label">{t('settings.feel')}</AppText>
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
        <View style={styles.segments} accessibilityRole="radiogroup">
          {LIGHTS.map((choice) => {
            const active = settings.theme === choice;
            return (
              <Pressy
                key={choice}
                onPress={() => update({ theme: choice })}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={t(`settings.lights.${choice}`)}
                style={[
                  styles.segment,
                  {
                    backgroundColor: active ? theme.accent : theme.surfaceRaised,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={
                    choice === 'system'
                      ? 'phone-portrait-outline'
                      : choice === 'dawn'
                        ? 'moon'
                        : 'sunny'
                  }
                  size={16}
                  color={active ? theme.onAccent : theme.text}
                />
                <AppText variant="heading" color={active ? theme.onAccent : theme.text}>
                  {t(`settings.lights.${choice}`)}
                </AppText>
              </Pressy>
            );
          })}
        </View>
        {LANGUAGES.length > 1 && (
          <>
            <AppText variant="label">{t('settings.language')}</AppText>
            <View style={styles.segments}>
              {[{ code: null, name: t('settings.languageDevice') }, ...LANGUAGES].map((l) => {
                const active = settings.language === l.code;
                return (
                  <Pressy
                    key={l.code ?? 'device'}
                    onPress={() => update({ language: l.code })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: active ? theme.accent : theme.surfaceRaised,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <AppText variant="heading" color={active ? theme.onAccent : theme.text}>
                      {l.name}
                    </AppText>
                  </Pressy>
                );
              })}
            </View>
          </>
        )}
      </Card>

      <Card style={styles.links}>
        <Row
          icon="help-circle-outline"
          label={t('settings.how')}
          onPress={() => router.push('/how')}
        />
        <Row
          icon="leaf-outline"
          label={t('settings.about')}
          onPress={() => router.push('/about')}
        />
        <Row
          icon="heart-outline"
          label={t('settings.support')}
          onPress={() => router.push('/support')}
        />
        <Row
          icon="shield-checkmark-outline"
          label={t('settings.money')}
          onPress={() => router.push('/money')}
        />
        <Row
          icon="document-text-outline"
          label={t('settings.privacy')}
          onPress={() => router.push('/privacy')}
        />
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
      <AppText variant="caption" center>
        {t('settings.credits')}
      </AppText>
    </Page>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <AppText variant="heading">{label}</AppText>
        {hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: theme.accent, false: theme.surfaceRaised }}
        thumbColor={value ? theme.onAccent : theme.muted}
        // React Native Web colours the thumb with its own prop.
        {...({ activeThumbColor: theme.onAccent } as object)}
      />
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} style={styles.row}>
      <Ionicons name={icon} size={22} color={theme.accentText} />
      <AppText variant="heading" style={styles.flex}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={theme.faint} />
    </Pressy>
  );
}

const styles = StyleSheet.create({
  group: { gap: 16 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  flex: { flex: 1 },
  segments: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segment: {
    flexGrow: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  links: { paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
});
