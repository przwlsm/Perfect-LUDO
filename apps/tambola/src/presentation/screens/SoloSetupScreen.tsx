import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MAX_CALL_SECONDS, MIN_CALL_SECONDS } from '@/domain/entities/Settings';
import { AppText, Button, Card, Segmented, Stepper } from '../components/Kit';
import { Page } from '../components/Page';
import { VoiceCard } from '../components/VoiceCard';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

/** Starts a solo game with these options (also used by "Play again"). */
export function startSolo(
  options: { tickets: number; rivals: number; speed: number },
  replace = false,
) {
  const params = {
    seed: String(Math.floor(Math.random() * 2 ** 31)),
    tickets: String(options.tickets),
    rivals: String(options.rivals),
    speed: String(options.speed),
  };
  const href = { pathname: '/solo/game' as const, params };
  if (replace) router.replace(href);
  else router.push(href);
}

export function SoloSetupScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, update, sounds } = useSettings();
  const [tickets, setTickets] = useState(2);
  const [rivals, setRivals] = useState(4);
  return (
    <Page
      title={t('solo.title')}
      festive
      footer={
        <Button
          big
          icon="play"
          label={t('solo.start')}
          onPress={() => {
            sounds.play('start');
            startSolo({ tickets, rivals, speed: settings.callSeconds });
          }}
        />
      }
    >
      <AppText variant="body" color={theme.muted}>
        {t('solo.lead')}
      </AppText>
      <Card style={styles.card}>
        <View style={styles.row}>
          <AppText variant="heading" style={styles.flex}>
            {t('solo.tickets')}
          </AppText>
          <Stepper
            label={t('solo.tickets')}
            value={tickets}
            min={1}
            max={4}
            onChange={setTickets}
            format={(v) => String(v)}
          />
        </View>
        <AppText variant="heading">{t('solo.rivals')}</AppText>
        <Segmented<number>
          label={t('solo.rivals')}
          value={rivals}
          onChange={setRivals}
          options={[3, 4, 5].map((n) => ({ value: n, label: t('solo.rivalsCount', { count: n }) }))}
        />
        <View style={styles.row}>
          <AppText variant="heading" style={styles.flex}>
            {t('solo.speed')}
          </AppText>
          <Stepper
            label={t('solo.speed')}
            value={settings.callSeconds}
            min={MIN_CALL_SECONDS}
            max={MAX_CALL_SECONDS}
            onChange={(callSeconds) => update({ callSeconds })}
            format={(v) => t('host.secondsShort', { count: v })}
          />
        </View>
      </Card>
      <VoiceCard title={t('host.voice')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
