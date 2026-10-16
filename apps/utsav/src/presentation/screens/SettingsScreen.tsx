import { useEffect, useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LIMITS } from '@/domain/entities/Card';
import { CARD_LANGUAGES, LANGUAGE_INFO } from '@/domain/entities/Language';
import type { ThemeChoice } from '@/domain/entities/Settings';
import { rewardedAds } from '@/config/container';
import { AppText, Card, Chip, Pressy, type IconName } from '../components/Kit';
import { Page } from '../components/Page';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

const THEMES: readonly ThemeChoice[] = ['system', 'ivory', 'night'];

export function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, update, calmMotion, cardLanguage } = useSettings();
  const { restore } = useEntitlements();
  const [name, setName] = useState(settings.name);
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
        <AppText variant="label">{t('settings.name')}</AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          onEndEditing={() => update({ name: name.trim() })}
          onBlur={() => update({ name: name.trim() })}
          placeholder={t('settings.namePlaceholder')}
          placeholderTextColor={theme.faint}
          maxLength={LIMITS.from}
          accessibilityLabel={t('settings.name')}
          maxFontSizeMultiplier={1.6}
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.surfaceRaised, borderColor: theme.border },
          ]}
        />
        <AppText variant="caption">{t('settings.nameHint', { name: name.trim() || '…' })}</AppText>
      </Card>

      <Card style={styles.group}>
        <AppText variant="label">{t('settings.cardLanguage')}</AppText>
        <View style={styles.wrap} accessibilityRole="radiogroup">
          {CARD_LANGUAGES.map((code) => (
            <Chip
              key={code}
              radio
              label={LANGUAGE_INFO[code].nativeName}
              accessibilityLabel={LANGUAGE_INFO[code].englishName}
              selected={cardLanguage === code}
              onPress={() => update({ cardLanguage: code })}
            />
          ))}
        </View>
        <AppText variant="caption">{t('settings.cardLanguageHint')}</AppText>
      </Card>

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
        <View style={styles.wrap} accessibilityRole="radiogroup">
          {THEMES.map((choice) => (
            <Chip
              key={choice}
              radio
              label={t(`settings.themes.${choice}`)}
              selected={settings.theme === choice}
              onPress={() => update({ theme: choice })}
            />
          ))}
        </View>
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
        {...{ activeThumbColor: theme.onAccent }}
      />
    </View>
  );
}

function Row({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
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
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    minHeight: 50,
    outlineWidth: 0,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  flex: { flex: 1 },
  links: { paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
});
