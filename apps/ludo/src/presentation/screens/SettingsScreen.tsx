import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../components/AppText';
import { router } from 'expo-router';
import { profileService, rewardedAds } from '@/config/container';
import { Body, Button, Card, Label, Screen, Sheet, useShared } from '../components/Kit';
import { SupportCard } from '../components/SupportCard';
import { useProfile } from '../state/ProfileProvider';
import { useAppUpdate, type OtaCheckResult } from '../state/AppUpdateProvider';
import { Walkthrough } from '../components/Walkthrough';
import { useLanguage } from '../i18n/LanguageProvider';
import { deviceLanguage } from '../i18n';
import { LANGUAGE_CODES, LANGUAGES, type LanguagePreference } from '../i18n/languages';
import { mirrorInRtl } from '../i18n/rtl';
import {
  makeStyles,
  useAppearance,
  useUi,
  type AppearancePreference,
} from '../theme/AppearanceProvider';

const TOGGLES = ['board3d', 'reducedMotion', 'soundEnabled'] as const;

export default function SettingsScreen() {
  const { profile, theme, perform, ready } = useProfile();
  const { t } = useTranslation('settings');
  const ui = useUi();
  const shared = useShared();
  const [name, setName] = useState<string | null>(null);
  const [message, setMessage] = useState<'saved' | 'saveFailed' | null>(null);
  const [busy, setBusy] = useState(false);
  async function update(settings: Parameters<typeof profileService.update>[0]) {
    setBusy(true);
    setMessage(null);
    try {
      await perform(() => profileService.update(settings));
      setMessage('saved');
    } catch {
      setMessage('saveFailed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title={t('title')} subtitle={t('subtitle')} decor="light">
      <LanguageCard />
      <AppearanceCard />
      <Card>
        <Label color={theme.accentText}>{t('name.label')}</Label>
        <Text style={shared.sectionTitle}>{t('name.title')}</Text>
        <TextInput
          accessibilityLabel={t('name.a11y')}
          value={name ?? profile.name}
          onChangeText={setName}
          maxLength={20}
          autoCorrect={false}
          placeholder={t('name.placeholder')}
          placeholderTextColor={ui.subtle}
          style={{
            color: ui.text,
            backgroundColor: theme.background,
            padding: 15,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: ui.border,
            fontSize: 16,
          }}
        />
        <Button
          compact
          disabled={!ready || busy || name === null}
          onPress={() => void update({ name: name ?? profile.name })}
        >
          {t('name.save')}
        </Button>
      </Card>
      <Card>
        <Label color={theme.accentText}>{t('lookAndFeel.label')}</Label>
        {TOGGLES.map((key) => (
          <View key={key} style={[shared.between, { paddingVertical: 8 }]}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[shared.sectionTitle, { fontSize: 16 }]}>
                {t(`lookAndFeel.${key}.title`)}
              </Text>
              <Text style={shared.small}>{t(`lookAndFeel.${key}.hint`)}</Text>
            </View>
            <Switch
              accessibilityLabel={t(`lookAndFeel.${key}.title`)}
              value={profile[key]}
              disabled={!ready || busy}
              onValueChange={(value) => void update({ [key]: value })}
              trackColor={{ false: ui.track, true: theme.accent }}
              thumbColor="#ffffff"
            />
          </View>
        ))}
      </Card>
      {message && (
        <Text accessibilityLiveRegion="polite" style={shared.small}>
          {t(message)}
        </Text>
      )}
      <SupportCard />
      <Card>
        <Label color={theme.accentText}>{t('about.label')}</Label>
        <Text style={shared.sectionTitle}>{t('about.title')}</Text>
        <Body>{t('about.offline')}</Body>
        <Body>{t('about.currency')}</Body>
        <Button secondary compact onPress={() => router.push('/feedback')}>
          {t('about.feedback')}
        </Button>
        <HowToPlayButton />
        <AdPrivacyButton />
      </Card>
      <UpdatesCard />
    </Screen>
  );
}

/**
 * Each language is listed in its own script, so a player who cannot read
 * the current one can still find theirs; the English name sits beneath.
 */
function LanguageCard() {
  const { theme } = useProfile();
  const { t } = useTranslation('settings');
  const ui = useUi();
  const s = useStyles();
  const shared = useShared();
  const { preference, setPreference } = useLanguage();
  const [pending, setPending] = useState<LanguagePreference | null>(null);
  const phone = LANGUAGES[deviceLanguage()];
  const options: { value: LanguagePreference; title: string; hint: string }[] = [
    {
      value: 'system',
      title: t('language.system'),
      hint: t('language.systemHint', { language: phone.nativeName }),
    },
    ...LANGUAGE_CODES.map((code) => ({
      value: code,
      title: LANGUAGES[code].nativeName,
      hint: LANGUAGES[code].englishName,
    })),
  ];

  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === preference) ?? options[0]!;

  async function choose(value: LanguagePreference) {
    if (pending) return;
    if (value === preference) {
      setOpen(false);
      return;
    }
    setPending(value);
    try {
      await setPreference(value);
      setOpen(false);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <Label color={theme.accentText}>{t('language.label')}</Label>
      {/* Eleven languages would make a very long card: show the current one,
          and the full list in a sheet. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('language.title')}
        accessibilityValue={{ text: current.title }}
        onPress={() => setOpen(true)}
        android_ripple={{ color: ui.ripple }}
        style={[s.option, { borderColor: `${theme.accent}55` }]}
      >
        <Ionicons name="language" size={22} color={theme.accentText} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.optionTitle}>{current.title}</Text>
          <Text style={shared.small}>{current.hint}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={ui.subtle} style={mirrorInRtl} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('language.title')}>
        <LanguageOptions
          options={options}
          selected={pending ?? preference}
          disabled={pending !== null}
          onChoose={(value) => void choose(value)}
        />
      </Sheet>
    </Card>
  );
}

const APPEARANCES: readonly {
  value: AppearancePreference;
  icon: 'phone-portrait-outline' | 'sunny' | 'moon';
}[] = [
  { value: 'system', icon: 'phone-portrait-outline' },
  { value: 'light', icon: 'sunny' },
  { value: 'dark', icon: 'moon' },
];

/** Day, night, or whatever the phone is set to. Applies instantly. */
function AppearanceCard() {
  const { theme } = useProfile();
  const { t } = useTranslation('settings');
  const { preference, setPreference } = useAppearance();
  const ui = useUi();
  const s = useStyles();
  return (
    <Card>
      <Label color={theme.accentText}>{t('appearance.label')}</Label>
      <View accessibilityRole="radiogroup" style={s.segments}>
        {APPEARANCES.map(({ value, icon }) => {
          const selected = preference === value;
          const label = t(`appearance.${value}`);
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={t('appearance.a11y', { option: label })}
              onPress={() => setPreference(value)}
              android_ripple={{ color: ui.ripple }}
              style={[
                s.segment,
                selected && { borderColor: theme.accent, backgroundColor: `${theme.accent}1f` },
              ]}
            >
              <Ionicons name={icon} size={22} color={selected ? theme.accentText : ui.subtle} />
              <Text style={[s.segmentText, selected && { color: theme.accentText }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function LanguageOptions({
  options,
  selected: selectedValue,
  disabled,
  onChoose,
}: {
  options: { value: LanguagePreference; title: string; hint: string }[];
  selected: LanguagePreference;
  disabled: boolean;
  onChoose(value: LanguagePreference): void;
}) {
  const { theme } = useProfile();
  const { t } = useTranslation('settings');
  const ui = useUi();
  const s = useStyles();
  const shared = useShared();
  return (
    <View accessibilityRole="radiogroup" style={s.options}>
      {options.map((option) => {
        const selected = selectedValue === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            accessibilityLabel={t('language.a11y', {
              name: option.title,
              englishName: option.hint,
            })}
            disabled={disabled}
            onPress={() => onChoose(option.value)}
            android_ripple={{ color: ui.ripple }}
            style={[
              s.option,
              selected && { borderColor: theme.accent, backgroundColor: `${theme.accent}14` },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.optionTitle}>{option.title}</Text>
              <Text style={shared.small}>{option.hint}</Text>
            </View>
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={selected ? theme.accentText : ui.subtle}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function HowToPlayButton() {
  const { t } = useTranslation('settings');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button secondary compact onPress={() => setOpen(true)}>
        {t('about.howToPlay')}
      </Button>
      <Walkthrough visible={open} onDone={() => setOpen(false)} />
    </>
  );
}

/** Only where the player's region requires a way to change ad consent (e.g. the EEA). */
function AdPrivacyButton() {
  const { t } = useTranslation('settings');
  const [required, setRequired] = useState(false);
  useEffect(() => {
    void rewardedAds.privacyOptionsRequired().then(setRequired);
  }, []);
  if (!required) return null;
  return (
    <Button secondary compact onPress={() => void rewardedAds.showPrivacyOptions()}>
      {t('about.adPrivacy')}
    </Button>
  );
}

function UpdatesCard() {
  const { theme } = useProfile();
  const { t } = useTranslation('settings');
  const shared = useShared();
  const { installedVersion, updateLabel, recheckStore, checkOta } = useAppUpdate();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<OtaCheckResult | 'store' | null>(null);

  async function check() {
    setChecking(true);
    setResult(null);
    try {
      const [store, ota] = await Promise.all([recheckStore(), checkOta()]);
      // A store update takes precedence: the update screen opens on its own.
      setResult(store === 'NONE' ? ota : 'store');
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card>
      <Label color={theme.accentText}>{t('version.label')}</Label>
      <View style={{ gap: 4 }}>
        <Text style={[shared.sectionTitle, { fontSize: 16 }]}>
          {t('version.name', { version: installedVersion ?? '' })}
        </Text>
        <Text style={shared.small}>
          {updateLabel
            ? t('version.includesUpdate', { id: updateLabel })
            : t('version.storeRelease')}
        </Text>
      </View>
      <Button secondary compact disabled={checking} onPress={() => void check()}>
        {checking ? t('version.checking') : t('version.check')}
      </Button>
      {result && (
        <Text accessibilityLiveRegion="polite" style={shared.small}>
          {t(`version.result.${result}`)}
        </Text>
      )}
    </Card>
  );
}

const useStyles = makeStyles((ui) => ({
  options: { gap: 10 },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.fill,
  },
  optionTitle: { color: ui.text, fontSize: 16, fontWeight: '700' },
  segments: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.fill,
  },
  segmentText: { color: ui.muted, fontSize: 13, fontWeight: '700', textAlign: 'center' },
}));
