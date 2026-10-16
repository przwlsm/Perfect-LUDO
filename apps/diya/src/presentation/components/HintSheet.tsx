import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { AppText, Button, Sheet } from './Kit';

interface HintSheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  /** Takes one hint (the caller spends it and changes the board). */
  readonly onUse: () => void;
}

/**
 * The hint offer: how many are left, one tap to use one. When today's are
 * gone, a video can earn one (only on a tap) and Plus makes them unlimited.
 */
export function HintSheet({ visible, onClose, onUse }: HintSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const ent = useEntitlements();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const left = ent.hintsLeft();
  const free = ent.freeHintsToday();
  const earned = ent.entitlements.hints;

  const watch = async () => {
    setBusy(true);
    setNote(null);
    const outcome = await ent.watchForHint();
    setBusy(false);
    if (outcome === 'granted') onUse();
    else setNote(t(`hints.${outcome}`));
  };

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        setNote(null);
        onClose();
      }}
      title={t('hints.title')}
    >
      <AppText variant="body" color={theme.muted}>
        {t('hints.body')}
      </AppText>
      <View
        style={[styles.count, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}
      >
        <Ionicons name="bulb" size={22} color={theme.accentText} />
        <AppText variant="heading" style={styles.flex}>
          {ent.plus
            ? t('hints.unlimited')
            : left > 0
              ? `${t('hints.left', { count: free })}${earned > 0 ? ` · ${t('hints.earned', { count: earned })}` : ''}`
              : t('hints.none')}
        </AppText>
      </View>
      <AppText variant="caption">{t('hints.stars')}</AppText>
      {left > 0 && <Button icon="sparkles" label={t('hints.use')} onPress={onUse} />}
      {!ent.plus && ent.adsReady && ent.adsLeft() > 0 && (
        <Button
          kind="secondary"
          icon="play-circle-outline"
          label={t('hints.watch')}
          busy={busy}
          onPress={() => void watch()}
        />
      )}
      {!ent.plus && left === 0 && (
        <Button
          kind={ent.adsReady ? 'ghost' : 'secondary'}
          icon="sparkles-outline"
          label={t('hints.plus')}
          onPress={() => {
            onClose();
            router.push('/support');
          }}
        />
      )}
      {note && (
        <AppText variant="caption" center color={theme.danger} accessibilityLiveRegion="polite">
          {note}
        </AppText>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  flex: { flex: 1 },
});
