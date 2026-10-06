import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TABLE_GIFTS, WalletRefusedError, type PlayerColor, type TableGiftId } from '@/domain';
import { Text } from '../components/AppText';
import { GemIcon } from '../components/Currency';
import { Body, Button, Sheet } from '../components/Kit';
import { LudoSpinner } from '../components/LoaderArt';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { liftByDay } from '../theme/surfaces';

/**
 * The gift sheet: aimed at one opponent, it lists the table gifts with their
 * gem prices and sends the tapped one. The sender's gems are charged by the
 * server first; only then does the gift fly (GameTable plays the flight).
 */
export function GiftPicker({
  target,
  targetName,
  targetColor,
  gems,
  onClose,
  onSend,
}: {
  target: PlayerColor | null;
  targetName: string;
  targetColor: string;
  /** The sender's gem balance, to grey out what they cannot afford. */
  gems: number;
  onClose(): void;
  onSend(color: PlayerColor, gift: TableGiftId): Promise<void>;
}) {
  const { t } = useTranslation('game');
  const s = useStyles();
  const ui = useUi();
  const [busy, setBusy] = useState<TableGiftId | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A fresh target starts with a clean sheet: the error belongs to the last aim.
  const [shownFor, setShownFor] = useState(target);
  if (shownFor !== target) {
    setShownFor(target);
    setError(null);
  }

  async function send(gift: TableGiftId) {
    if (!target || busy) return;
    setBusy(gift);
    setError(null);
    try {
      await onSend(target, gift);
      onClose();
    } catch (e) {
      setError(e instanceof WalletRefusedError ? e.message : t('gift.failed'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet visible={target !== null} onClose={onClose} title={t('gift.title')}>
      <View style={s.aim}>
        <View style={[s.dot, { backgroundColor: targetColor }]} />
        <Body>{t('gift.subtitle', { name: targetName })}</Body>
      </View>
      <View style={s.grid}>
        {TABLE_GIFTS.map((gift) => {
          const affordable = gems >= gift.gems;
          const enabled = affordable && busy === null;
          return (
            <Pressable
              key={gift.id}
              accessibilityRole="button"
              accessibilityLabel={t('gift.sendA11y', {
                gift: t(`gift.names.${gift.id}`),
                gems: gift.gems,
              })}
              accessibilityState={{ disabled: !enabled, busy: busy === gift.id }}
              disabled={!enabled}
              onPress={() => void send(gift.id)}
              android_ripple={{ color: ui.ripple }}
              style={[s.tile, !affordable && s.tileOff]}
            >
              <Text style={s.emoji}>{gift.emoji}</Text>
              <Text style={s.name}>{t(`gift.names.${gift.id}`)}</Text>
              <Text style={s.blurb} numberOfLines={2}>
                {t(`gift.blurb.${gift.id}`)}
              </Text>
              {busy === gift.id ? (
                <LudoSpinner size={18} />
              ) : (
                <View style={s.price}>
                  <GemIcon size={14} />
                  <Text style={[s.priceText, !affordable && { color: ui.subtle }]}>
                    {gift.gems}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text style={s.error}>{error}</Text>
      ) : gems < Math.min(...TABLE_GIFTS.map((g) => g.gems)) ? (
        <Text style={s.note}>{t('gift.needGems')}</Text>
      ) : null}
      <Button secondary compact onPress={onClose}>
        {t('gift.cancel')}
      </Button>
    </Sheet>
  );
}

const useStyles = makeStyles((ui) => ({
  aim: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.scheme === 'light' ? '#ffffff' : ui.fill,
    boxShadow: liftByDay(ui),
  },
  tileOff: { opacity: 0.55 },
  emoji: { fontSize: 34 },
  name: { color: ui.text, fontSize: 15, fontWeight: '800' },
  blurb: { color: ui.muted, fontSize: 11, lineHeight: 15, textAlign: 'center', minHeight: 30 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  priceText: { color: ui.gem, fontSize: 14, fontWeight: '900' },
  note: { color: ui.muted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  error: { color: ui.danger, fontSize: 13, lineHeight: 18, textAlign: 'center' },
}));
