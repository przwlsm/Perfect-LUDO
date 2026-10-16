import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEntitlements, type AdOutcome } from '../state/EntitlementsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { AppText, Button, Sheet } from './Kit';

export interface LockedItem {
  /** Day-pass id, e.g. `pack:festivals`. */
  readonly id: string;
  readonly title: string;
}

/**
 * A bonus pack or chat colour: open it for a day with a video the learner
 * chose to watch, or see Plus. Never shown unasked, never during a lesson.
 */
export function LockedSheet({
  item,
  onClose,
  onOpened,
}: {
  item: LockedItem | null;
  onClose: () => void;
  onOpened?: (item: LockedItem) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { adsReady, watchForPass, warmAds, adsLeft } = useEntitlements();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    // Ad consent and SDK set-up start only when someone opens a video offer.
    if (item) warmAds();
  }, [item, warmAds]);
  const close = () => {
    setNote(null);
    onClose();
  };
  const notes: Record<Exclude<AdOutcome, 'granted'>, string> = {
    limit: t('locked.limit'),
    unfinished: t('locked.unfinished'),
    unavailable: t('locked.unavailable'),
  };
  const video = adsReady && adsLeft() > 0;
  return (
    <Sheet visible={item !== null} onClose={close} title={item?.title}>
      <AppText color={theme.muted}>{video ? t('locked.body') : t('locked.bodyNoVideo')}</AppText>
      {video && (
        <Button
          icon="play-circle"
          label={t('locked.watch')}
          busy={busy}
          onPress={() => {
            if (!item) return;
            setBusy(true);
            void watchForPass(item.id)
              .then((outcome) => {
                if (outcome === 'granted') {
                  onOpened?.(item);
                  close();
                } else setNote(notes[outcome]);
              })
              .finally(() => setBusy(false));
          }}
        />
      )}
      <Button
        kind="secondary"
        icon="sparkles"
        label={t('locked.plus')}
        onPress={() => {
          close();
          router.push('/support');
        }}
      />
      {note && (
        <AppText variant="caption" center accessibilityLiveRegion="polite">
          {note}
        </AppText>
      )}
    </Sheet>
  );
}
