import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { voiceGender } from '@/application/voice/selectVoice';
import { dialogue } from '@/domain/content/catalogue';
import { LANG_IDS, LANGUAGES } from '@/domain/content/languages';
import type { LangId } from '@/domain/content/types';
import { NativeText, NoVoiceNote } from '../components/Bits';
import { AppText, Card, IconButton, Pressy } from '../components/Kit';
import { Page } from '../components/Page';
import { useContent } from '../state/useContent';
import { useSettings } from '../state/SettingsProvider';
import { useVoice } from '../state/VoiceProvider';
import { useTheme } from '../theme/ThemeProvider';

/** Settings → Voices: the device's voices for each language, with a preview. */
export function VoicesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { lang } = useContent();
  const voice = useVoice();
  const order: LangId[] = [lang, ...LANG_IDS.filter((l) => l !== lang)];
  return (
    <Page title={t('voice.title')}>
      <AppText color={theme.muted}>{t('voice.lead')}</AppText>
      {voice.voices === null ? (
        <AppText variant="caption">{t('voice.loading')}</AppText>
      ) : (
        order.map((l, i) => (
          <View key={l} style={styles.section}>
            {i <= 1 && (
              <AppText variant="label" color={i === 0 ? theme.accentText : theme.muted}>
                {i === 0 ? t('voice.current') : t('voice.others')}
              </AppText>
            )}
            <LanguageVoices lang={l} current={i === 0} />
          </View>
        ))
      )}
      {voice.voices !== null && (
        <Card style={styles.how}>
          <Ionicons name="download-outline" size={20} color={theme.accentText} />
          <AppText variant="caption" color={theme.text} style={styles.flex}>
            {Platform.OS === 'ios' ? t('voice.addIos') : t('voice.addAndroid')}
          </AppText>
        </Card>
      )}
      <Card style={styles.how}>
        <Ionicons name="information-circle-outline" size={20} color={theme.accentText} />
        <AppText variant="caption" color={theme.text} style={styles.flex}>
          {t('voice.how')}
        </AppText>
      </Card>
    </Page>
  );
}

function LanguageVoices({ lang, current }: { lang: LangId; current: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { settings, update } = useSettings();
  const voice = useVoice();
  const options = voice.optionsFor(lang);
  const chosen = voice.voiceFor(lang);
  const sample = dialogue(lang, 'greetings')[0]?.native ?? LANGUAGES[lang].nativeName;
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <AppText variant="heading" style={styles.flex}>
          {t(`languages.${lang}`)}
        </AppText>
        <NativeText lang={lang} size={17} color={theme.accentText}>
          {LANGUAGES[lang].nativeName}
        </NativeText>
      </View>
      {options.length === 0 ? (
        current ? (
          <NoVoiceNote lang={lang} />
        ) : (
          <AppText variant="caption">{t('voice.noneHere')}</AppText>
        )
      ) : (
        <View accessibilityRole="radiogroup" style={styles.list}>
          {options.map((v, i) => {
            const on = chosen?.id === v.id;
            const gender = voiceGender(v);
            const tags = [
              v.enhanced ? t('voice.enhanced') : null,
              /network/i.test(v.id) ? t('voice.online') : null,
              gender === 'female'
                ? t('voice.likelyFemale')
                : gender === 'male'
                  ? t('voice.likelyMale')
                  : null,
            ].filter(Boolean);
            const title = [t('voice.voiceN', { n: i + 1 }), ...tags].join(' · ');
            return (
              <View
                key={v.id}
                style={[
                  styles.row,
                  {
                    backgroundColor: on ? theme.surfaceRaised : 'transparent',
                    borderColor: on ? theme.teal : theme.border,
                  },
                ]}
              >
                <Pressy
                  feedback
                  onPress={() => update({ voices: { ...settings.voices, [lang]: v.id } })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={on ? t('voice.chosenA11y', { voice: title }) : title}
                  style={styles.pick}
                >
                  <Ionicons
                    name={on ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={on ? theme.teal : theme.faint}
                  />
                  <View style={styles.flex}>
                    <AppText variant="heading" style={styles.voiceTitle}>
                      {title}
                    </AppText>
                    <AppText variant="caption" numberOfLines={1}>
                      {v.name}
                    </AppText>
                  </View>
                </Pressy>
                <IconButton
                  icon="play"
                  size={44}
                  plain
                  label={t('voice.preview', { voice: title })}
                  onPress={() => voice.preview(lang, v, sample)}
                />
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: 8 },
  card: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 4,
  },
  pick: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  voiceTitle: { fontSize: 15 },
  how: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});
