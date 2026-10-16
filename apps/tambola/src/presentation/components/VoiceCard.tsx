import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FUN_VOICE } from '@/domain/entities/Look';
import type { VoiceLanguage } from '@/domain/entities/Settings';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { AppText, Badge, Button, Card, Segmented, Toggle } from './Kit';

/** The caller's voice choices, shared by Host setup and Settings. */
export function VoiceCard({ title }: { title?: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  const { isOpen } = useEntitlements();
  const funOpen = isOpen(FUN_VOICE);
  return (
    <Card style={styles.card}>
      {title ? <AppText variant="label">{title}</AppText> : null}
      <Toggle
        label={t('host.voiceOn')}
        hint={t('host.voiceHint')}
        value={settings.voice}
        onChange={(voice) => update({ voice })}
      />
      {settings.voice && (
        <View style={styles.group}>
          <AppText variant="caption">{t('host.language')}</AppText>
          <Segmented<VoiceLanguage>
            label={t('host.language')}
            value={settings.voiceLanguage}
            onChange={(voiceLanguage) => update({ voiceLanguage })}
            options={[
              { value: 'en', label: t('host.english') },
              { value: 'hi', label: t('host.hindi') },
            ]}
          />
        </View>
      )}
      <Toggle
        label={t('host.funText')}
        hint={t('host.funTextHint')}
        value={settings.funCalls}
        onChange={(funCalls) => update({ funCalls })}
      />
      {settings.voice && (
        <View style={styles.group}>
          <Toggle
            label={t('host.funVoice')}
            hint={t('host.funVoiceHint')}
            value={funOpen && settings.funVoice}
            disabled={!funOpen}
            onChange={(funVoice) => update({ funVoice })}
            trailing={!funOpen ? <Badge label={t('common.plus')} icon="sparkles" /> : null}
          />
          {!funOpen && (
            <Button
              kind="secondary"
              compact
              icon="sparkles-outline"
              label={t('looks.watch')}
              onPress={() => router.push('/looks')}
              style={{ borderColor: theme.border }}
            />
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  group: { gap: 8 },
});
