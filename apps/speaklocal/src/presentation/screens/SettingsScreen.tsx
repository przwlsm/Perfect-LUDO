import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CITIES, LANGUAGES as LANGS } from '@/domain/content/languages';
import { BUBBLES, passId, type BubbleId } from '@/domain/entities/Bubbles';
import type { Speed, ThemeChoice } from '@/domain/entities/Settings';
import { rewardedAds } from '@/config/container';
import { NativeText } from '../components/Bits';
import { AppText, Card, Pressy, Segmented, Sheet } from '../components/Kit';
import { LockedSheet, type LockedItem } from '../components/Offers';
import { Page } from '../components/Page';
import { LANGUAGES } from '../i18n';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useContent } from '../state/useContent';
import { useSettings } from '../state/SettingsProvider';
import { useVoice } from '../state/VoiceProvider';
import { BUBBLE_LOOKS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

const THEMES: readonly ThemeChoice[] = ['system', 'day', 'dusk'];
const SPEEDS: readonly Speed[] = ['slow', 'normal'];

export function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, update, calmMotion } = useSettings();
  const { restore, open } = useEntitlements();
  const { city, lang } = useContent();
  const voice = useVoice();
  const [adPrivacy, setAdPrivacy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [cities, setCities] = useState(false);
  const [locked, setLocked] = useState<LockedItem | null>(null);
  useEffect(() => {
    let live = true;
    void rewardedAds.privacyOptionsRequired().then((required) => {
      if (live) setAdPrivacy(required);
    });
    return () => {
      live = false;
    };
  }, []);
  const chosen = voice.voiceFor(lang);

  const pickBubbles = (id: BubbleId, premium: boolean) => {
    if (!open({ id: passId('bubbles', id), premium })) {
      setLocked({ id: passId('bubbles', id), title: t(`bubbles.${id}`) });
      return;
    }
    update({ bubbles: id });
  };

  return (
    <Page title={t('settings.title')}>
      <Card style={styles.group}>
        <AppText variant="label">{t('settings.learning')}</AppText>
        <Row
          icon="location-outline"
          label={t('settings.city')}
          value={t('settings.cityValue', {
            city: t(`cities.${city.id}`),
            language: t(`languages.${lang}`),
          })}
          onPress={() => setCities(true)}
        />
        <Row
          icon="mic-circle-outline"
          label={t('settings.voices')}
          value={chosen ? chosen.name : t('settings.voicesHint')}
          onPress={() => router.push('/voices')}
        />
        <Toggle
          label={t('settings.hindi')}
          hint={t('settings.hindiHint')}
          value={settings.hindiMeanings}
          onChange={(hindiMeanings) => update({ hindiMeanings })}
        />
        <View>
          <AppText variant="heading">{t('settings.speed')}</AppText>
          <AppText variant="caption">{t('settings.speedHint')}</AppText>
        </View>
        <Segmented
          options={SPEEDS}
          value={settings.speed}
          label={(s) => t(`settings.speeds.${s}`)}
          onChange={(speed) => update({ speed })}
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
        <AppText variant="heading">{t('settings.theme')}</AppText>
        <Segmented
          options={THEMES}
          value={settings.theme}
          label={(c) => t(`settings.themes.${c}`)}
          onChange={(c) => update({ theme: c })}
        />
        <View>
          <AppText variant="heading">{t('bubbles.title')}</AppText>
          <AppText variant="caption">{t('bubbles.hint')}</AppText>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatches}
        >
          {BUBBLES.map((b) => {
            const look = BUBBLE_LOOKS[b.id][theme.scheme];
            const isOpen = open({ id: passId('bubbles', b.id), premium: b.premium });
            const active = settings.bubbles === b.id;
            return (
              <Pressy
                key={b.id}
                onPress={() => pickBubbles(b.id, b.premium)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={
                  isOpen ? t(`bubbles.${b.id}`) : `${t(`bubbles.${b.id}`)}, ${t('common.plus')}`
                }
                style={[
                  styles.swatch,
                  {
                    borderColor: active ? theme.accent : theme.border,
                    backgroundColor: theme.surfaceRaised,
                  },
                ]}
              >
                <View style={[styles.bubble, { backgroundColor: look.bg }]}>
                  <NativeText lang={lang} size={18} color={look.fg}>
                    {LANGS[lang].sample}
                  </NativeText>
                </View>
                <AppText variant="caption" center color={theme.text} numberOfLines={1}>
                  {t(`bubbles.${b.id}`)}
                </AppText>
                {!isOpen && (
                  <View style={[styles.lock, { backgroundColor: theme.accent }]}>
                    <Ionicons name="lock-closed" size={11} color={theme.onAccent} />
                  </View>
                )}
              </Pressy>
            );
          })}
        </ScrollView>
        {LANGUAGES.length > 1 && (
          <>
            <AppText variant="heading">{t('settings.language')}</AppText>
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

      <Card style={styles.links}>
        <Row
          icon="heart-outline"
          label={t('settings.support')}
          onPress={() => router.push('/support')}
        />
        <Row
          icon="mic-outline"
          label={t('settings.recordings')}
          onPress={() => router.push('/progress')}
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
      {note && (
        <AppText variant="caption" center accessibilityLiveRegion="polite">
          {note}
        </AppText>
      )}
      <AppText variant="caption" center>
        {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
      </AppText>

      <Sheet visible={cities} onClose={() => setCities(false)} title={t('settings.citySheet')}>
        {CITIES.map((c) => {
          const on = c.id === city.id;
          return (
            <Pressy
              key={c.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={t('onboarding.cityA11y', {
                city: t(`cities.${c.id}`),
                language: t(`languages.${c.lang}`),
              })}
              onPress={() => {
                update({ city: c.id });
                setCities(false);
              }}
              style={[
                styles.cityRow,
                {
                  backgroundColor: on ? theme.surfaceRaised : theme.surface,
                  borderColor: on ? theme.teal : theme.border,
                },
              ]}
            >
              <View style={styles.flex}>
                <AppText variant="heading">{t(`cities.${c.id}`)}</AppText>
                <AppText variant="caption">{t(`cityBlurb.${c.id}`)}</AppText>
              </View>
              <NativeText lang={c.lang} size={18} color={theme.accentText}>
                {LANGS[c.lang].nativeName}
              </NativeText>
              {on && <Ionicons name="checkmark-circle" size={22} color={theme.teal} />}
            </Pressy>
          );
        })}
      </Sheet>
      <LockedSheet
        item={locked}
        onClose={() => setLocked(null)}
        onOpened={(item) => update({ bubbles: item.id.split(':')[1] as BubbleId })}
      />
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
        trackColor={{ true: theme.teal, false: theme.track }}
        thumbColor={value ? '#ffffff' : theme.faint}
        {...({ activeThumbColor: '#ffffff' } as object)}
      />
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressy
      onPress={onPress}
      accessibilityLabel={value ? `${label}: ${value}` : label}
      style={styles.row}
    >
      <Ionicons name={icon} size={22} color={theme.accentText} />
      <View style={styles.flex}>
        <AppText variant="heading">{label}</AppText>
        {value ? (
          <AppText variant="caption" numberOfLines={1}>
            {value}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.faint} />
    </Pressy>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  flex: { flex: 1 },
  links: { paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
  swatches: { gap: 10, paddingVertical: 2, paddingRight: 8 },
  swatch: { width: 92, borderRadius: 18, borderWidth: 2, padding: 8, gap: 6, alignItems: 'center' },
  bubble: {
    width: 64,
    height: 40,
    borderRadius: 16,
    borderTopRightRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    minHeight: 60,
  },
});
