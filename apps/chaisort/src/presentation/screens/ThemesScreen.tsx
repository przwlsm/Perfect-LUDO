import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { passRemaining } from 'app-kit';
import { CUP_THEMES, type CupTheme } from '@/domain/entities/CupTheme';
import { CounterPreview } from '../counter/CounterPreview';
import { LOOKS } from '../counter/looks';
import { AppText, Button, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { HERO } from '../components/scenes';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

/** Cup themes: same puzzles, different cups. The kulhad is free; the rest come with Plus or a day's pass. */
export function ThemesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { settings, update, calmMotion, haptics, sounds } = useSettings();
  const ent = useEntitlements();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ id: string; text: string } | null>(null);
  const previewW = Math.min(width, 640) - 32 - 36;

  const choose = (c: CupTheme) => {
    update({ cups: c.id });
    haptics.tap();
    sounds.play('clink');
  };
  const watch = async (c: CupTheme) => {
    setBusy(c.id);
    setNote(null);
    ent.warmAds();
    const outcome = await ent.watchForTheme(c);
    setBusy(null);
    if (outcome === 'granted') {
      choose(c);
      setNote({ id: c.id, text: t('themes.watched') });
    } else setNote({ id: c.id, text: t(`hints.${outcome}`) });
  };

  return (
    <Page title={t('themes.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('themes.lead')}
      </AppText>
      {CUP_THEMES.map((c) => {
        const open = ent.isThemeOpen(c);
        const active = settings.cups === c.id && open;
        const hours = Math.ceil(passRemaining(ent.entitlements, c.id, ent.now) / 3_600_000);
        return (
          <Card
            key={c.id}
            style={[styles.card, active && { borderColor: theme.accent, borderWidth: 2 }]}
          >
            <View style={[styles.preview, { backgroundColor: theme.surfaceRaised }]}>
              <CounterPreview
                cups={HERO}
                width={previewW}
                height={Math.round(previewW * 0.42)}
                look={LOOKS[c.id]}
                palette={theme}
                symbols={settings.symbols}
                calm={calmMotion || !active}
              />
            </View>
            <View style={styles.head}>
              <View style={styles.flex}>
                <AppText variant="title">{t(`themes.names.${c.id}`)}</AppText>
                <AppText variant="caption">{t(`themes.lines.${c.id}`)}</AppText>
              </View>
              {!c.premium ? (
                <Tag text={t('common.free')} />
              ) : ent.plus ? (
                <Tag text={t('common.plus')} />
              ) : open ? (
                <Tag text={t('themes.open', { hours })} />
              ) : (
                <Ionicons name="lock-closed" size={18} color={theme.muted} />
              )}
            </View>
            {active ? (
              <View style={styles.inUse}>
                <Ionicons name="checkmark-circle" size={20} color={theme.good} />
                <AppText variant="heading" color={theme.good}>
                  {t('themes.inUse')}
                </AppText>
              </View>
            ) : open ? (
              <Button
                kind="secondary"
                icon="cafe"
                label={t('themes.use')}
                onPress={() => choose(c)}
              />
            ) : (
              <View style={styles.row}>
                {ent.adsReady && ent.adsLeft() > 0 && (
                  <Button
                    kind="secondary"
                    compact
                    icon="play-circle-outline"
                    label={t('themes.watch')}
                    busy={busy === c.id}
                    onPress={() => void watch(c)}
                    style={styles.flex}
                  />
                )}
                <Button
                  compact
                  icon="sparkles"
                  label={t('themes.getPlus')}
                  onPress={() => router.push('/support')}
                  style={styles.flex}
                />
              </View>
            )}
            {note?.id === c.id && (
              <AppText variant="caption" center accessibilityLiveRegion="polite">
                {note.text}
              </AppText>
            )}
          </Card>
        );
      })}
      {!ent.plus && (
        <AppText variant="caption" center>
          {t('themes.plusLine')}
        </AppText>
      )}
    </Page>
  );
}

function Tag({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
      <AppText variant="label" color={theme.accentText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  preview: { alignItems: 'center', borderRadius: 18, overflow: 'hidden', paddingTop: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  inUse: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  row: { flexDirection: 'row', gap: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
});
