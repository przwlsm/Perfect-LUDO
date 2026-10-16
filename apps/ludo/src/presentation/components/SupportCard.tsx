import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TIP_PRODUCTS, type StoreListing } from '@/domain';
import { iapService } from '@/config/container';
import { Text } from './AppText';
import { Body, Button, Card, Label, Sheet, useShared } from './Kit';
import { LudoSpinner } from './LoaderArt';
import { useProfile } from '../state/ProfileProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { liftByDay } from '../theme/surfaces';

/** One cup per tier, smallest first (matches TIP_PRODUCTS). */
const TIERS = [
  { sku: 'ludo.tip.coffee', icon: '☕', key: 'coffee' },
  { sku: 'ludo.tip.big', icon: '☕☕', key: 'bigCoffee' },
  { sku: 'ludo.tip.feast', icon: '☕🍰', key: 'feast' },
] as const;

/** "Gift more": the bigger tips, in the sheet behind the Gift more button. */
const MORE = [
  { sku: 'ludo.tip.lunch', icon: '🍱', key: 'lunch' },
  { sku: 'ludo.tip.dinner', icon: '🍽️', key: 'dinner' },
  { sku: 'ludo.tip.party', icon: '🎉', key: 'party' },
  { sku: 'ludo.tip.patron', icon: '👑', key: 'patron' },
] as const;

/**
 * "Buy me a coffee": voluntary tips that help keep the game running.
 *
 * Tips go through the store's own billing (Google Play / App Store), never an
 * outside payment link, which store rules forbid for in-app payments. They
 * unlock nothing in the game. Prices are the store's localized ones; until
 * the store lists the tip products (a store build, products created in Play
 * Console) the tiers show without prices and explain why.
 */
export function SupportCard() {
  const { t } = useTranslation();
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const { member, theme, adoptWallet } = useProfile();
  const [listings, setListings] = useState<readonly StoreListing[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<'thanks' | 'failed' | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!member || !iapService?.supported()) return;
    let alive = true;
    void iapService.listings().then((next) => {
      if (alive) setListings(next);
    });
    return () => {
      alive = false;
    };
  }, [member]);

  const priceOf = (sku: string) => listings.find((l) => l.sku === sku)?.price;
  const open = member && TIP_PRODUCTS.some((p) => priceOf(p.sku));

  async function tip(sku: string) {
    if (!iapService || busy) return;
    setBusy(sku);
    setResult(null);
    setMoreOpen(false);
    try {
      // A tip grants nothing, but the verified wallet comes back all the same.
      await adoptWallet(await iapService.purchase(sku));
      setResult('thanks');
    } catch {
      setResult('failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card style={s.card}>
      <Label color={theme.accentText}>{t('support.label')}</Label>
      <Text style={shared.sectionTitle}>{t('support.title')}</Text>
      <Body>{t('support.body')}</Body>

      <View style={s.tiers}>
        {TIERS.map((tier) => {
          const price = priceOf(tier.sku);
          const enabled = Boolean(open && price) && busy === null;
          return (
            <Pressable
              key={tier.sku}
              accessibilityRole="button"
              accessibilityLabel={t('support.tipA11y', {
                tier: t(`support.tiers.${tier.key}`),
                price: price ?? '',
              })}
              accessibilityState={{ disabled: !enabled, busy: busy === tier.sku }}
              disabled={!enabled}
              onPress={() => void tip(tier.sku)}
              android_ripple={{ color: ui.ripple }}
              style={[s.tier, !open && s.tierIdle]}
            >
              <Text style={s.icon}>{tier.icon}</Text>
              <Text style={s.tierName} numberOfLines={2}>
                {t(`support.tiers.${tier.key}`)}
              </Text>
              {busy === tier.sku ? (
                <LudoSpinner size={18} />
              ) : (
                <Text style={s.price}>{price ?? '—'}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {result === 'thanks' ? (
        <Text style={[s.note, { color: ui.green }]}>{t('support.thanks')}</Text>
      ) : result === 'failed' ? (
        <Text style={[s.note, { color: ui.danger }]}>{t('support.failed')}</Text>
      ) : !member ? (
        <Button secondary compact onPress={() => router.push('/login')}>
          {t('support.signIn')}
        </Button>
      ) : !open ? (
        <Text style={s.note}>{t('support.unavailable')}</Text>
      ) : (
        <Text style={s.note}>{t('support.noReward')}</Text>
      )}

      {member && (
        <Button secondary compact disabled={busy !== null} onPress={() => setMoreOpen(true)}>
          {t('support.more')}
        </Button>
      )}

      <Sheet visible={moreOpen} onClose={() => setMoreOpen(false)} title={t('support.moreTitle')}>
        <Body>{t('support.moreBody')}</Body>
        {MORE.map((tier) => {
          const price = priceOf(tier.sku);
          const enabled = Boolean(open && price) && busy === null;
          return (
            <Pressable
              key={tier.sku}
              accessibilityRole="button"
              accessibilityLabel={t('support.tipA11y', {
                tier: t(`support.tiers.${tier.key}`),
                price: price ?? '',
              })}
              accessibilityState={{ disabled: !enabled }}
              disabled={!enabled}
              onPress={() => void tip(tier.sku)}
              android_ripple={{ color: ui.ripple }}
              style={[s.row, !open && s.tierIdle]}
            >
              <Text style={s.rowIcon}>{tier.icon}</Text>
              <Text style={s.rowName}>{t(`support.tiers.${tier.key}`)}</Text>
              <Text style={s.price}>{price ?? '—'}</Text>
            </Pressable>
          );
        })}
        <Text style={s.note}>{open ? t('support.noReward') : t('support.unavailable')}</Text>
      </Sheet>
    </Card>
  );
}

const useStyles = makeStyles((ui) => ({
  card: { gap: 12 },
  tiers: { flexDirection: 'row', gap: 10 },
  tier: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.scheme === 'light' ? '#ffffff' : ui.fill,
    boxShadow: liftByDay(ui),
  },
  tierIdle: { opacity: 0.7 },
  icon: { fontSize: 24 },
  tierName: { color: ui.text, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  price: { color: ui.gold, fontSize: 14, fontWeight: '900' },
  note: { color: ui.muted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.scheme === 'light' ? '#ffffff' : ui.fill,
    boxShadow: liftByDay(ui),
  },
  rowIcon: { fontSize: 26 },
  rowName: { flex: 1, color: ui.text, fontSize: 16, fontWeight: '800' },
}));
