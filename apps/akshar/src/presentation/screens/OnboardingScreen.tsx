import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Goal } from '@/domain/entities/Settings';
import type { ScriptId } from '@/domain/entities/Script';
import { SCRIPTS } from '@/domain/entities/scripts';
import { SAMPLE, ScriptText } from '../components/Bits';
import { AppText, Button, IconButton, Pressy } from '../components/Kit';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

const GOALS: readonly { id: Goal; icon: 'map-outline' | 'people-outline' | 'sparkles-outline' }[] =
  [
    { id: 'signs', icon: 'map-outline' },
    { id: 'child', icon: 'people-outline' },
    { id: 'curious', icon: 'sparkles-outline' },
  ];

/** Welcome → pick scripts → what brings you here. Writing within seconds; no sign-up. */
export function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update, calmMotion } = useSettings();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<readonly ScriptId[]>(settings.scripts);
  const [goal, setGoal] = useState<Goal | null>(settings.goal);

  const toggle = (id: ScriptId) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const finish = () => {
    update({ scripts: picked, goal, onboarded: true });
    router.replace('/');
  };

  const enter = calmMotion ? undefined : FadeInRight.springify().damping(20);
  const exit = calmMotion ? undefined : FadeOutLeft.duration(160);

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
                    backgroundColor: i === step ? theme.accent : theme.starEmpty,
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
              style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.heroGrid}>
                {SCRIPTS.map((s, i) => (
                  <View key={s.id} style={[styles.heroCell, { backgroundColor: theme.tints[i] }]}>
                    <ScriptText script={s} size={34} style={styles.heroLetter}>
                      {SAMPLE[s.id]}
                    </ScriptText>
                  </View>
                ))}
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
          <Animated.View key="pick" entering={enter} exiting={exit} style={styles.flex}>
            <AppText variant="title" accessibilityRole="header">
              {t('onboarding.pickTitle')}
            </AppText>
            <AppText variant="caption" style={styles.hint}>
              {t('onboarding.pickHint')}
            </AppText>
            <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
              {SCRIPTS.map((s, i) => {
                const on = picked.includes(s.id);
                return (
                  <Pressy
                    key={s.id}
                    onPress={() => toggle(s.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={t('onboarding.pickA11y', {
                      name: t(`scripts.${s.id}.name`),
                      languages: t(`scripts.${s.id}.languages`),
                    })}
                    style={[
                      styles.pick,
                      {
                        backgroundColor: on ? theme.tints[i] : theme.surface,
                        borderColor: on ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <ScriptText script={s} size={38} style={styles.pickLetter}>
                      {SAMPLE[s.id]}
                    </ScriptText>
                    <AppText variant="heading" center numberOfLines={1}>
                      {t(`scripts.${s.id}.name`)}
                    </AppText>
                    <AppText variant="caption" center numberOfLines={2} style={styles.pickLangs}>
                      {t(`scripts.${s.id}.languages`)}
                    </AppText>
                    {on && (
                      <View style={[styles.check, { backgroundColor: theme.accent }]}>
                        <Ionicons name="checkmark" size={14} color={theme.onAccent} />
                      </View>
                    )}
                  </Pressy>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View key="goal" entering={enter} exiting={exit} style={styles.flex}>
            <AppText variant="title" accessibilityRole="header">
              {t('onboarding.goalTitle')}
            </AppText>
            <AppText variant="caption" style={styles.hint}>
              {t('onboarding.goalHint')}
            </AppText>
            <View style={styles.goals}>
              {GOALS.map((g) => {
                const on = goal === g.id;
                return (
                  <Pressy
                    key={g.id}
                    onPress={() => setGoal(g.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={t(`onboarding.goals.${g.id}.title`)}
                    style={[
                      styles.goal,
                      {
                        backgroundColor: on ? theme.surfaceRaised : theme.surface,
                        borderColor: on ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.goalIcon,
                        { backgroundColor: on ? theme.accent : theme.surfaceRaised },
                      ]}
                    >
                      <Ionicons
                        name={g.icon}
                        size={22}
                        color={on ? theme.onAccent : theme.accentText}
                      />
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="heading">{t(`onboarding.goals.${g.id}.title`)}</AppText>
                      <AppText variant="caption">{t(`onboarding.goals.${g.id}.body`)}</AppText>
                    </View>
                  </Pressy>
                );
              })}
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
              disabled={picked.length === 0}
              onPress={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Button label={t('onboarding.finish')} icon="create-outline" onPress={finish} />
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
  hero: { borderRadius: 32, borderWidth: 1, padding: 14, alignSelf: 'center', marginBottom: 12 },
  heroGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 76 + 2 * 8, gap: 8 },
  heroCell: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLetter: { textAlign: 'center' },
  lead: { fontFamily: FONTS.body, fontSize: 17, lineHeight: 25, paddingHorizontal: 8 },
  hint: { marginTop: 4, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 12 },
  pick: {
    width: '31.5%',
    minWidth: 100,
    flexGrow: 1,
    borderRadius: 20,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  pickLetter: { textAlign: 'center' },
  pickLangs: { fontSize: 12, lineHeight: 16 },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goals: { gap: 12 },
  goal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    borderWidth: 2,
    padding: 16,
  },
  goalIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audience: { marginTop: 18 },
  footer: { paddingTop: 12 },
});
