import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ALL_PRIZES, normalizePrizes, type PrizeId } from '@/domain/entities/Prize';
import { MAX_CALL_SECONDS, MIN_CALL_SECONDS, type CallMode } from '@/domain/entities/Settings';
import { AppText, Button, Card, Chip, Segmented, Sheet, Stepper } from '../components/Kit';
import { Page } from '../components/Page';
import { VoiceCard } from '../components/VoiceCard';
import { useGame } from '../state/GameProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

export function HostSetupScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, update, sounds } = useSettings();
  const { host, hostStart, hostEnd } = useGame();
  const [confirm, setConfirm] = useState(false);
  const prizes = settings.hostPrizes;

  const toggle = (p: PrizeId) => {
    if (p === 'full') return;
    const next = prizes.includes(p) ? prizes.filter((x) => x !== p) : [...prizes, p];
    update({ hostPrizes: normalizePrizes(next) });
  };

  const open = () => {
    hostStart(prizes);
    sounds.play('start');
    router.replace('/host/caller');
  };

  return (
    <Page
      title={t('host.title')}
      festive
      footer={
        <Button
          big
          icon="megaphone"
          label={t('host.create')}
          onPress={() => (host ? setConfirm(true) : open())}
        />
      }
    >
      <AppText variant="body" color={theme.muted}>
        {t('host.lead')}
      </AppText>

      <Card style={styles.card}>
        <AppText variant="label">{t('host.prizes')}</AppText>
        <View style={styles.chips}>
          {ALL_PRIZES.map((p) => (
            <Chip
              key={p}
              label={t(`prizes.${p}`)}
              selected={prizes.includes(p)}
              icon={prizes.includes(p) ? 'checkmark' : 'add'}
              locked={p === 'full'}
              onPress={() => toggle(p)}
              accessibilityLabel={`${t(`prizes.${p}`)}. ${t(`prizeHelp.${p}`)}`}
            />
          ))}
        </View>
        <AppText variant="caption">{t('host.prizesHint')}</AppText>
      </Card>

      <Card style={styles.card}>
        <AppText variant="label">{t('host.calling')}</AppText>
        <Segmented<CallMode>
          label={t('caller.mode')}
          value={settings.callMode}
          onChange={(callMode) => update({ callMode })}
          options={[
            { value: 'auto', label: t('host.auto') },
            { value: 'tap', label: t('host.tap') },
          ]}
        />
        {settings.callMode === 'auto' && (
          <View style={styles.speed}>
            <AppText variant="body" style={styles.flex}>
              {t('host.every')}
            </AppText>
            <Stepper
              label={t('caller.speed')}
              value={settings.callSeconds}
              min={MIN_CALL_SECONDS}
              max={MAX_CALL_SECONDS}
              onChange={(callSeconds) => update({ callSeconds })}
              format={(v) => t('host.secondsShort', { count: v })}
            />
          </View>
        )}
      </Card>

      <VoiceCard title={t('host.voice')} />

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title={t('host.replaceTitle')}>
        <AppText variant="body" color={theme.muted}>
          {t('host.replaceBody', { code: host?.code ?? '' })}
        </AppText>
        <Button
          label={t('host.replace')}
          icon="refresh"
          onPress={() => {
            setConfirm(false);
            hostEnd();
            open();
          }}
        />
        <Button
          kind="secondary"
          label={t('host.keep')}
          onPress={() => {
            setConfirm(false);
            router.replace('/host/caller');
          }}
        />
      </Sheet>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  speed: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
