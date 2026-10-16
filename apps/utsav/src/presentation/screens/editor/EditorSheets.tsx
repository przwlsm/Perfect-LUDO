import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Template } from '@/domain/entities/Template';
import { AppText, Button, Sheet } from '../../components/Kit';
import { useEntitlements, type AdOutcome } from '../../state/EntitlementsProvider';
import { useSettings } from '../../state/SettingsProvider';
import { useTheme } from '../../theme/ThemeProvider';

/** Offered when the sender wants to share a Plus design they have not opened. */
export function UnlockSheet({
  template,
  visible,
  onClose,
  onChooseFree,
}: {
  template: Template;
  visible: boolean;
  onClose: () => void;
  onChooseFree: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { adsReady, adsLeft, watchFor } = useEntitlements();
  const { haptics, sounds } = useSettings();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<AdOutcome | null>(null);
  const left = adsLeft();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('unlock.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('unlock.body')}
      </AppText>
      {adsReady && (
        <>
          <Button
            icon="play-circle"
            label={t('unlock.watch')}
            busy={busy}
            disabled={left <= 0}
            onPress={() => {
              setBusy(true);
              setOutcome(null);
              void watchFor(template)
                .then((result) => {
                  setOutcome(result);
                  if (result === 'granted') {
                    haptics.delight();
                    sounds.play('chime');
                    setTimeout(onClose, 900);
                  }
                })
                .finally(() => setBusy(false));
            }}
          />
          <AppText variant="caption" center>
            {left > 0 ? t('unlock.watchLeft', { count: left }) : t('unlock.limit')}
          </AppText>
        </>
      )}
      {outcome && outcome !== 'granted' && (
        <AppText variant="body" center color={theme.danger} accessibilityLiveRegion="polite">
          {t(`unlock.${outcome}`)}
        </AppText>
      )}
      {outcome === 'granted' && (
        <AppText variant="body" center color={theme.success} accessibilityLiveRegion="polite">
          {t('unlock.granted')}
        </AppText>
      )}
      <Button
        kind={adsReady ? 'secondary' : 'primary'}
        icon="sparkles"
        label={t('unlock.plus')}
        onPress={() => {
          onClose();
          router.push('/support');
        }}
      />
      <Button kind="ghost" label={t('unlock.free')} onPress={onChooseFree} />
    </Sheet>
  );
}

/** Offered when the sender taps something that comes with Plus (status size, lettering). */
export function PlusOnlySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('plusOnly.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('plusOnly.status')}
      </AppText>
      <Button
        icon="sparkles"
        label={t('plusOnly.see')}
        onPress={() => {
          onClose();
          router.push('/support');
        }}
      />
      <Button kind="ghost" label={t('common.close')} onPress={onClose} />
    </Sheet>
  );
}
