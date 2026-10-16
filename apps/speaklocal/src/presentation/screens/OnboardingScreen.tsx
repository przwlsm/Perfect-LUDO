import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInRight, FadeOut, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CITIES, LANGUAGES } from '@/domain/content/languages';
import type { CityId } from '@/domain/content/types';
import { NativeText } from '../components/Bits';
import { AppText, Button, IconButton, Pressy } from '../components/Kit';
import { Skyline } from '../skyline/Skyline';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

/** Welcome → which city → meanings in. Speaking within seconds; no sign-up. */
export function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { settings, update, calmMotion } = useSettings();
  const [step, setStep] = useState(0);
  const [city, setCity] = useState<CityId | null>(settings.city);
  const [hindi, setHindi] = useState(settings.hindiMeanings);
  const [hero, setHero] = useState(0);
  const column = Math.min(width, 560) - 40;
  const cardW = (column - 12) / 2;

  useEffect(() => {
    if (calmMotion || step !== 0) return;
    const id = setInterval(() => setHero((h) => (h + 1) % CITIES.length), 2800);
    return () => clearInterval(id);
  }, [calmMotion, step]);

  const finish = () => {
    if (!city) return;
    update({ city, hindiMeanings: hindi, onboarded: true });
    router.replace('/');
  };

  const enter = calmMotion ? undefined : FadeInRight.springify().damping(20);
  const exit = calmMotion ? undefined : FadeOutLeft.duration(160);
  const heroCity = CITIES[hero]!;

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}
    >
      <View style={styles.column}>
        <View style={styles.top}>
          {step > 0 ? (
            <IconButton
              icon="chevron-back"
              label={t('common.back')}
              plain
              onPress={() => setStep((s) => s - 1)}
            />
          ) : (
            <View style={styles.spacer} />
          )}
          <View
            style={styles.dots}
            accessible
            accessibilityLabel={t('onboarding.step', { step: step + 1 })}
          >
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === step ? theme.accent : theme.track,
                    width: i === step ? 22 : 8,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.spacer} />
        </View>

        {step === 0 && (
          <Animated.View key="welcome" entering={enter} exiting={exit} style={styles.welcome}>
            <View
              style={[
                styles.hero,
                { borderColor: theme.border, boxShadow: `0 14px 36px ${theme.shadow}` },
              ]}
            >
              <Animated.View
                key={heroCity.id}
                entering={calmMotion ? undefined : FadeIn.duration(600)}
                exiting={calmMotion ? undefined : FadeOut.duration(600)}
                style={StyleSheet.absoluteFill}
              >
                <Skyline kind={heroCity.skyline} width={column} height={220} lively />
              </Animated.View>
              <View
                style={[
                  styles.heroTag,
                  { backgroundColor: theme.glass, borderColor: theme.glassBorder },
                ]}
              >
                <AppText variant="heading" style={styles.heroTagText}>
                  {t(`cities.${heroCity.id}`)}
                </AppText>
                <NativeText lang={heroCity.lang} size={16} color={theme.accentText}>
                  {LANGUAGES[heroCity.lang].nativeName}
                </NativeText>
              </View>
            </View>
            <AppText variant="display" center accessibilityRole="header">
              {t('onboarding.welcomeTitle')}
            </AppText>
            <AppText center color={theme.muted} style={styles.lead}>
              {t('onboarding.welcomeBody')}
            </AppText>
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View key="city" entering={enter} exiting={exit} style={styles.flex}>
            <AppText variant="title" accessibilityRole="header">
              {t('onboarding.cityTitle')}
            </AppText>
            <AppText variant="caption" style={styles.hint}>
              {t('onboarding.cityHint')}
            </AppText>
            <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
              {CITIES.map((c) => {
                const on = city === c.id;
                return (
                  <Pressy
                    key={c.id}
                    onPress={() => setCity(c.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={t('onboarding.cityA11y', {
                      city: t(`cities.${c.id}`),
                      language: t(`languages.${c.lang}`),
                    })}
                    style={[
                      styles.cityCard,
                      {
                        width: cardW,
                        backgroundColor: theme.surface,
                        borderColor: on ? theme.teal : theme.border,
                      },
                    ]}
                  >
                    <View style={styles.cityArt}>
                      <Skyline kind={c.skyline} width={cardW - 4} height={74} />
                    </View>
                    <View style={styles.cityText}>
                      <AppText variant="heading" numberOfLines={1}>
                        {t(`cities.${c.id}`)}
                      </AppText>
                      <View style={styles.langRow}>
                        <AppText variant="caption" numberOfLines={1} style={styles.langName}>
                          {t(`languages.${c.lang}`)}
                        </AppText>
                        <NativeText lang={c.lang} size={14} color={theme.accentText}>
                          {LANGUAGES[c.lang].nativeName}
                        </NativeText>
                      </View>
                    </View>
                    {on && (
                      <View style={[styles.check, { backgroundColor: theme.teal }]}>
                        <Ionicons name="checkmark" size={15} color={theme.onTeal} />
                      </View>
                    )}
                  </Pressy>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View key="meanings" entering={enter} exiting={exit} style={styles.flex}>
            <AppText variant="title" accessibilityRole="header">
              {t('onboarding.meaningsTitle')}
            </AppText>
            <AppText variant="caption" style={styles.hint}>
              {t('onboarding.meaningsHint')}
            </AppText>
            <View style={styles.options}>
              {[false, true].map((h) => {
                const on = hindi === h;
                return (
                  <Pressy
                    key={String(h)}
                    onPress={() => setHindi(h)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={h ? t('onboarding.hindi') : t('onboarding.english')}
                    style={[
                      styles.option,
                      {
                        backgroundColor: on ? theme.surfaceRaised : theme.surface,
                        borderColor: on ? theme.teal : theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        { backgroundColor: on ? theme.teal : theme.surfaceRaised },
                      ]}
                    >
                      <Ionicons
                        name={h ? 'language-outline' : 'text-outline'}
                        size={22}
                        color={on ? theme.onTeal : theme.accentText}
                      />
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="heading">
                        {h ? t('onboarding.hindi') : t('onboarding.english')}
                      </AppText>
                      <AppText variant="caption">
                        {h ? t('onboarding.hindiBody') : t('onboarding.englishBody')}
                      </AppText>
                    </View>
                  </Pressy>
                );
              })}
            </View>
            <View style={[styles.voiceNote, { backgroundColor: theme.surfaceRaised }]}>
              <Ionicons name="volume-high-outline" size={20} color={theme.accentText} />
              <AppText variant="caption" color={theme.text} style={styles.flex}>
                {t('onboarding.voiceNote')}
              </AppText>
            </View>
            <AppText variant="caption" center style={styles.audience}>
              {t('onboarding.audience')}
            </AppText>
          </Animated.View>
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {step === 0 && (
            <Button label={t('onboarding.begin')} icon="arrow-forward" onPress={() => setStep(1)} />
          )}
          {step === 1 && (
            <Button
              label={t('common.continue')}
              icon="arrow-forward"
              disabled={!city}
              onPress={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Button label={t('onboarding.finish')} icon="chatbubbles-outline" onPress={finish} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 560, paddingHorizontal: 20 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  spacer: { width: 48 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  flex: { flex: 1 },
  welcome: { flex: 1, justifyContent: 'center', gap: 16 },
  hero: { height: 220, borderRadius: 28, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  heroTag: {
    position: 'absolute',
    left: 14,
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  heroTagText: { fontSize: 15 },
  lead: { fontFamily: FONTS.body, fontSize: 17, lineHeight: 25, paddingHorizontal: 6 },
  hint: { marginTop: 4, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 12 },
  cityCard: { borderRadius: 20, borderWidth: 2, overflow: 'hidden' },
  cityArt: { height: 74, overflow: 'hidden', borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  cityText: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 },
  langRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  langName: { flexShrink: 1 },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: { gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    borderWidth: 2,
    padding: 16,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceNote: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
    alignItems: 'flex-start',
  },
  audience: { marginTop: 16 },
  footer: { paddingTop: 12 },
});
