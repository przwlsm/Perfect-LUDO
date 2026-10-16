import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { reviews } from '@/config/container';
import { AppText, Button, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { Confetti } from '../effects/Confetti';
import { useGame } from '../state/GameProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { startSolo } from './SoloSetupScreen';

export function ResultsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { result } = useGame();
  const { settings, update, sounds, haptics } = useSettings();
  const mine = result ? result.rows.filter((r) => r.you).length : 0;
  const celebrate = !!result && (result.mode === 'party' || mine > 0);
  const [burst] = useState(celebrate ? 1 : 0);

  useEffect(() => {
    if (!result) {
      router.replace('/');
      return;
    }
    if (celebrate) {
      sounds.play('cheer');
      haptics.delight();
    }
    // The store's review card, once, after a genuinely good moment.
    if (celebrate && !settings.reviewAsked) {
      update({ reviewAsked: true });
      const timer = setTimeout(() => void reviews.request(), 2500);
      return () => clearTimeout(timer);
    }
    // Only when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!result) return null;

  const solo = result.mode === 'solo';
  const title = solo
    ? mine > 0
      ? t('results.youWonCount', { count: mine })
      : t('results.noWins')
    : t('results.partyTitle');
  const subtitle = solo
    ? mine > 0
      ? null
      : t('results.noWinsBody')
    : t('results.partyBody', { code: result.code ?? '', count: result.calls });

  return (
    <View style={styles.flex}>
      <Page
        title={t('results.title')}
        festive
        onBack={() => router.replace('/')}
        footer={
          <View style={styles.footer}>
            {solo && result.replay ? (
              <Button
                big
                icon="refresh"
                label={t('results.again')}
                onPress={() => startSolo(result.replay!, true)}
              />
            ) : (
              <Button
                big
                icon="megaphone"
                label={t('results.hostAgain')}
                onPress={() => router.replace('/host')}
              />
            )}
            <Button
              kind="secondary"
              icon="home"
              label={t('results.home')}
              onPress={() => router.replace('/')}
            />
          </View>
        }
      >
        <View style={styles.hero}>
          <View
            style={[
              styles.trophy,
              { backgroundColor: celebrate ? theme.accent : theme.surfaceRaised },
            ]}
          >
            <Ionicons
              name={celebrate ? 'trophy' : 'happy-outline'}
              size={54}
              color={celebrate ? theme.onAccent : theme.accentText}
            />
          </View>
          <AppText variant="display" center accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="body" center color={theme.muted}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <Card style={styles.list}>
          {result.rows.map((row, i) => (
            <View
              key={`${row.prize}-${i}`}
              style={[styles.row, i > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}
            >
              <Ionicons
                name={row.you ? 'trophy' : row.winner ? 'ribbon-outline' : 'remove-circle-outline'}
                size={22}
                color={row.you ? theme.accentText : row.winner ? theme.secondText : theme.faint}
              />
              <View style={styles.flex}>
                <AppText variant="heading">{t(`prizes.${row.prize}`)}</AppText>
                {row.bogus && (
                  <AppText variant="caption" color={theme.danger}>
                    {t('results.lostBogus')}
                  </AppText>
                )}
              </View>
              <AppText
                variant="heading"
                color={row.you ? theme.accentText : row.winner ? theme.text : theme.muted}
                style={styles.winner}
                numberOfLines={2}
              >
                {row.winner ?? t('results.nobody')}
              </AppText>
            </View>
          ))}
        </Card>
      </Page>
      <Confetti burst={burst} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { gap: 10 },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  trophy: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8 },
  winner: { maxWidth: '50%', textAlign: 'right' },
});
