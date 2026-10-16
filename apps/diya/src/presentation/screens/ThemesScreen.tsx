import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { passRemaining } from 'app-kit';
import { FESTIVALS, type Festival } from '@/domain/entities/Festival';
import { BoardPreview } from '../board/BoardPreview';
import { AppText, Button, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { HERO } from '../components/scenes';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { LOOKS } from '../theme/festivals';
import { useTheme } from '../theme/ThemeProvider';

/** Festival skins: same puzzles, different lamps. Diwali is free; the rest come with Plus or a day's pass. */
export function ThemesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { settings, update, calmMotion, haptics, sounds } = useSettings();
  const ent = useEntitlements();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ id: string; text: string } | null>(null);
  const previewW = Math.min(width, 640) - 32 - 36;

  const choose = (f: Festival) => {
    update({ festival: f.id });
    haptics.tap();
    sounds.play('light3');
  };
  const watch = async (f: Festival) => {
    setBusy(f.id);
    setNote(null);
    ent.warmAds();
    const outcome = await ent.watchForFestival(f);
    setBusy(null);
    if (outcome === 'granted') {
      choose(f);
      setNote({ id: f.id, text: t('themes.watched') });
    } else setNote({ id: f.id, text: t(`hints.${outcome}`) });
  };

  return (
    <Page title={t('themes.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('themes.lead')}
      </AppText>
      {FESTIVALS.map((f) => {
        const open = ent.isFestivalOpen(f);
        const active = settings.festival === f.id && open;
        const hours = Math.ceil(passRemaining(ent.entitlements, f.id, ent.now) / 3_600_000);
        return (
          <Card
            key={f.id}
            style={[styles.card, active && { borderColor: theme.accent, borderWidth: 2 }]}
          >
            <View style={styles.preview}>
              <BoardPreview
                level={HERO}
                width={previewW}
                height={Math.round(previewW * 0.5)}
                look={LOOKS[f.id]}
                scheme={theme.scheme}
                calm={calmMotion || !active}
              />
            </View>
            <View style={styles.head}>
              <View style={styles.flex}>
                <AppText variant="title">{t(`themes.names.${f.id}`)}</AppText>
                <AppText variant="caption">{t(`themes.lines.${f.id}`)}</AppText>
              </View>
              {!f.premium ? (
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
                icon="color-wand"
                label={t('themes.use')}
                onPress={() => choose(f)}
              />
            ) : (
              <View style={styles.row}>
                {ent.adsReady && ent.adsLeft() > 0 && (
                  <Button
                    kind="secondary"
                    compact
                    icon="play-circle-outline"
                    label={t('themes.watch')}
                    busy={busy === f.id}
                    onPress={() => void watch(f)}
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
            {note?.id === f.id && (
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
  preview: { alignItems: 'center', marginHorizontal: -4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  inUse: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  row: { flexDirection: 'row', gap: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
});
