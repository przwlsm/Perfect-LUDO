import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Handedness, PenSize, ThemeChoice } from '@/domain/entities/Settings';
import { SCRIPTS } from '@/domain/entities/scripts';
import { rewardedAds } from '@/config/container';
import { SAMPLE, ScriptText } from '../components/Bits';
import { AppText, Card, Pressy, Segmented } from '../components/Kit';
import { Page } from '../components/Page';
import { LANGUAGES } from '../i18n';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

const THEMES: readonly ThemeChoice[] = ['system', 'paper', 'slate'];
const HANDS: readonly Handedness[] = ['right', 'left'];
const SIZES: readonly PenSize[] = ['fine', 'medium', 'bold'];

export function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, update, calmMotion } = useSettings();
  const { restore } = useEntitlements();
  const [adPrivacy, setAdPrivacy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
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
        <AppText variant="label">{t('settings.theme')}</AppText>
        <Segmented
          options={THEMES}
          value={settings.theme}
          label={(c) => t(`settings.themes.${c}`)}
          onChange={(c) => update({ theme: c })}
        />
        <AppText variant="label">{t('settings.hand')}</AppText>
        <Segmented
          options={HANDS}
          value={settings.handedness}
          label={(h) => t(`settings.hands.${h}`)}
          onChange={(h) => update({ handedness: h })}
        />
        <AppText variant="caption" style={styles.under}>
          {t('settings.handHint')}
        </AppText>
        <AppText variant="label">{t('settings.pen')}</AppText>
        <Segmented
          options={SIZES}
          value={settings.penSize}
          label={(s) => t(`settings.penSizes.${s}`)}
          onChange={(s) => update({ penSize: s })}
        />
        {LANGUAGES.length > 1 && (
          <>
            <AppText variant="label">{t('settings.language')}</AppText>
            <Segmented
              options={['device', ...LANGUAGES.map((l) => l.code)]}
              value={settings.language ?? 'device'}
              label={(c) =>
                c === 'device'
                  ? t('settings.languageDevice')
                  : (LANGUAGES.find((l) => l.code === c)?.name ?? c)
              }
              onChange={(c) => update({ language: c === 'device' ? null : c })}
            />
          </>
        )}
      </Card>

      <Card style={styles.group}>
        <View>
          <AppText variant="label">{t('settings.scripts')}</AppText>
          <AppText variant="caption">{t('settings.scriptsHint')}</AppText>
        </View>
        <View style={styles.scripts}>
          {SCRIPTS.map((s) => {
            const on = settings.scripts.includes(s.id);
            return (
              <Pressy
                key={s.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t(`scripts.${s.id}.name`)}
                onPress={() => {
                  if (on && settings.scripts.length === 1) {
                    setNote(t('settings.keepOne'));
                    return;
                  }
                  setNote(null);
                  update({
                    scripts: on
                      ? settings.scripts.filter((x) => x !== s.id)
                      : [...settings.scripts, s.id],
                  });
                }}
                style={[
                  styles.scriptChip,
                  {
                    backgroundColor: on ? theme.accent : theme.surfaceRaised,
                    borderColor: on ? 'transparent' : theme.border,
                  },
                ]}
              >
                <ScriptText script={s} size={18} color={on ? theme.onAccent : theme.text}>
                  {SAMPLE[s.id]}
                </ScriptText>
                <AppText
                  variant="heading"
                  color={on ? theme.onAccent : theme.text}
                  style={styles.chipText}
                >
                  {t(`scripts.${s.id}.name`)}
                </AppText>
              </Pressy>
            );
          })}
        </View>
        {note && (
          <AppText variant="caption" accessibilityLiveRegion="polite">
            {note}
          </AppText>
        )}
      </Card>

      <Card style={styles.links}>
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
          icon="information-circle-outline"
          label={t('settings.about')}
          onPress={() => router.push('/about')}
        />
        <Row
          icon="refresh-outline"
          label={t('settings.restore')}
          onPress={() =>
            void restore().then((found) =>
              setNote(found ? t('support.restored') : t('support.nothingToRestore')),
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

      <AppText variant="caption" center>
        {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
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
        trackColor={{ true: theme.accent, false: theme.starEmpty }}
        thumbColor={value ? theme.onAccent : theme.muted}
        // react-native-web colours the "on" thumb with its own prop.
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
  group: { gap: 12 },
  under: { marginTop: -4 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  flex: { flex: 1 },
  scripts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scriptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 23,
    borderWidth: 1,
  },
  chipText: { fontSize: 15 },
  links: { paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
});
