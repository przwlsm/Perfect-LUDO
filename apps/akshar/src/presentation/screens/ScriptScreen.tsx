import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { nextLetterIndex, starsOf, tally } from '@/domain/entities/Progress';
import { lettersOf } from '@/domain/entities/Script';
import { isScriptId, SCRIPTS, scriptById } from '@/domain/entities/scripts';
import { ProgressRing, ScriptText, Stars } from '../components/Bits';
import { AppText, Button, Card, Pressy } from '../components/Kit';
import { Page } from '../components/Page';
import { PracticeSheet } from '../components/PracticeSheet';
import { useProgress } from '../state/ProgressProvider';
import { useTheme } from '../theme/ThemeProvider';

/** One script: its letters by group, each with its stars. */
export function ScriptScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = isScriptId(params.id) ? params.id : 'devanagari';
  const script = scriptById(id);
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { progress } = useProgress();
  const [sheet, setSheet] = useState(false);
  const tl = tally(progress, script);
  const all = lettersOf(script);
  const next = nextLetterIndex(progress, script);
  const tint = theme.tints[SCRIPTS.indexOf(script)];

  const inner = Math.min(width, 640) - 32;
  const columns = inner >= 520 ? 6 : 4;
  const tileSize = Math.floor((inner - (columns - 1) * 8) / columns);

  return (
    <Page title={t(`scripts.${id}.name`)}>
      <Card style={[styles.head, { backgroundColor: tint }]}>
        <View style={styles.flex}>
          <ScriptText script={script} size={30}>
            {script.native}
          </ScriptText>
          <AppText variant="caption" color={theme.text}>
            {t(`scripts.${id}.languages`)}
          </AppText>
          <AppText variant="caption" color={theme.text} style={styles.count}>
            {t('script.progress', { started: tl.started, total: tl.letters, stars: tl.stars })}
          </AppText>
        </View>
        <ProgressRing value={tl.stars / tl.maxStars} size={64} stroke={6} />
      </Card>

      <AppText variant="caption">{t('script.howItWorks')}</AppText>

      <View style={styles.actions}>
        <Button
          style={styles.flex}
          icon="create-outline"
          label={t('script.continue', { letter: all[next]!.translit })}
          onPress={() => router.push(`/trace/${id}/${next}`)}
        />
        <Button
          kind="secondary"
          icon="print-outline"
          label={t('script.sheet')}
          onPress={() => setSheet(true)}
        />
      </View>

      {script.groups.map((group) => {
        const offset = all.indexOf(group.letters[0]!);
        return (
          <View key={group.id} style={styles.group}>
            <AppText variant="label">{t(`groups.${group.id}`)}</AppText>
            <View style={[styles.grid, script.rtl && styles.rtl]}>
              {group.letters.map((l, i) => {
                const stars = starsOf(progress, id, l.char);
                return (
                  <Pressy
                    key={l.char}
                    onPress={() => router.push(`/trace/${id}/${offset + i}`)}
                    accessibilityLabel={t('script.letterA11y', {
                      letter: l.char,
                      translit: l.translit,
                      count: stars,
                    })}
                    style={[
                      styles.tile,
                      {
                        width: tileSize,
                        backgroundColor: stars >= 3 ? tint : theme.surface,
                        borderColor: offset + i === next ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <ScriptText
                      script={script}
                      size={Math.round(tileSize * 0.42)}
                      style={styles.tileLetter}
                    >
                      {l.char}
                    </ScriptText>
                    <AppText
                      variant="caption"
                      color={theme.text}
                      numberOfLines={1}
                      style={styles.tileTranslit}
                    >
                      {l.translit}
                    </AppText>
                    <Stars count={stars} size={12} gap={1} />
                  </Pressy>
                );
              })}
            </View>
          </View>
        );
      })}
      <PracticeSheet script={script} visible={sheet} onClose={() => setSheet(false)} />
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  count: { marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  group: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rtl: { flexDirection: 'row-reverse' },
  tile: {
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  tileLetter: { textAlign: 'center' },
  tileTranslit: { marginTop: -4, marginBottom: 2 },
});
