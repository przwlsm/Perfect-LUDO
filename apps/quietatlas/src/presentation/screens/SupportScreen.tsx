import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  PLUS_SKU,
  PurchaseRefusedError,
  TIP_PRODUCTS,
  type TipProduct,
} from '@/domain/entities/Products';
import { billing } from '@/config/container';
import { AppText, Button, Card, Pressy, Sheet } from '../components/Kit';
import { Page } from '../components/Page';
import { priceOf, useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

type Note = { kind: 'good' | 'bad'; text: string } | null;

export function SupportScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { plus, listings, buyPlus, tip, restore, entitlements } = useEntitlements();
  const { haptics, sounds } = useSettings();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [more, setMore] = useState(false);
  const plusPrice = priceOf(listings, PLUS_SKU);
  const storeOpen = billing.supported();

  const run = async (sku: string, action: () => Promise<void>, thanks: string) => {
    setBusy(sku);
    setNote(null);
    try {
      await action();
      haptics.delight();
      sounds.play('golden');
      setNote({ kind: 'good', text: thanks });
    } catch (e) {
      if (e instanceof PurchaseRefusedError && e.cancelled) return;
      setNote({
        kind: 'bad',
        text: e instanceof Error && e.message ? e.message : t('support.failed'),
      });
    } finally {
      setBusy(null);
    }
  };

  const tipRow = (product: TipProduct, wide: boolean) => {
    const price = priceOf(listings, product.sku);
    const enabled = !!price && busy === null;
    const name = t(`support.tips.${product.key}`);
    return (
      <Pressy
        key={product.sku}
        disabled={!enabled}
        onPress={() =>
          void run(product.sku, () => tip(product.sku), t('support.thanks')).then(() =>
            setMore(false),
          )
        }
        accessibilityLabel={t('support.tipA11y', { tier: name, price: price ?? '' })}
        accessibilityState={{ disabled: !enabled, busy: busy === product.sku }}
        style={[
          wide ? styles.tipWide : styles.tip,
          {
            backgroundColor: theme.surfaceRaised,
            borderColor: theme.border,
            opacity: price ? 1 : 0.6,
          },
        ]}
      >
        <Text style={styles.tipIcon} allowFontScaling={false}>
          {product.icon}
        </Text>
        <AppText variant="heading" center={!wide} style={wide && styles.flex}>
          {name}
        </AppText>
        {busy === product.sku ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <AppText variant="heading" color={theme.accentText}>
            {price ?? '—'}
          </AppText>
        )}
      </Pressy>
    );
  };

  return (
    <Page title={t('support.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('support.lead')}
      </AppText>

      <View
        style={[
          styles.plus,
          { borderColor: theme.border, boxShadow: `0 14px 36px ${theme.shadow}` },
        ]}
      >
        <LinearGradient
          colors={[theme.scheme === 'dusk' ? '#3a2a6b' : '#ffe2b8', theme.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.plusHead}>
          <View style={[styles.plusBadge, { backgroundColor: theme.accent }]}>
            <Ionicons name="sparkles" size={20} color={theme.onAccent} />
          </View>
          <AppText variant="title">{t('support.plusTitle')}</AppText>
        </View>
        <AppText variant="body">{plus ? t('support.plusOwned') : t('support.plusBody')}</AppText>
        {!plus && (
          <Button
            icon="sparkles"
            label={plusPrice ? t('support.buy', { price: plusPrice }) : t('support.buyNoPrice')}
            busy={busy === PLUS_SKU}
            disabled={!plusPrice || busy !== null}
            onPress={() => void run(PLUS_SKU, buyPlus, t('support.plusOwned'))}
          />
        )}
        {storeOpen && (
          <Button
            kind="ghost"
            compact
            label={t('support.restore')}
            disabled={busy !== null}
            onPress={() => {
              setBusy('restore');
              setNote(null);
              void restore()
                .then((found) =>
                  setNote(
                    found
                      ? { kind: 'good', text: t('support.restored') }
                      : { kind: 'bad', text: t('support.nothingToRestore') },
                  ),
                )
                .finally(() => setBusy(null));
            }}
          />
        )}
      </View>

      <Card style={styles.tips}>
        <AppText variant="title">🍵 {t('support.tipsTitle')}</AppText>
        <AppText variant="body" color={theme.muted}>
          {t('support.tipsBody')}
        </AppText>
        <View style={styles.tipRow}>
          {TIP_PRODUCTS.filter((p) => p.featured).map((p) => tipRow(p, false))}
        </View>
        <Button
          kind="secondary"
          compact
          icon="gift-outline"
          label={t('support.more')}
          onPress={() => setMore(true)}
        />
        {entitlements.tips > 0 && (
          <AppText variant="caption" center>
            {t('support.thanksCount', { count: entitlements.tips })}
          </AppText>
        )}
      </Card>

      {!storeOpen && (
        <AppText variant="caption" center>
          {t('support.unavailable')}
        </AppText>
      )}
      {note && (
        <AppText
          variant="body"
          center
          color={note.kind === 'good' ? theme.teal : theme.danger}
          accessibilityLiveRegion="polite"
        >
          {note.text}
        </AppText>
      )}

      <Pressy onPress={() => router.push('/money')} accessibilityLabel={t('support.howCta')}>
        <Card style={styles.how}>
          <Ionicons name="shield-checkmark-outline" size={24} color={theme.teal} />
          <View style={styles.flex}>
            <AppText variant="heading">{t('support.howTitle')}</AppText>
            <AppText variant="caption">{t('support.howCta')}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.faint} />
        </Card>
      </Pressy>

      <Sheet visible={more} onClose={() => setMore(false)} title={t('support.moreTitle')}>
        <AppText variant="body" color={theme.muted}>
          {t('support.tipsBody')}
        </AppText>
        {TIP_PRODUCTS.map((p) => tipRow(p, true))}
      </Sheet>
    </Page>
  );
}

const styles = StyleSheet.create({
  plus: { borderRadius: 28, borderWidth: 1, padding: 20, gap: 14, overflow: 'hidden' },
  plusHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  plusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tips: { gap: 12 },
  tipRow: { flexDirection: 'row', gap: 10 },
  tip: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 112,
    justifyContent: 'center',
  },
  tipWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 56,
  },
  tipIcon: { fontSize: 28 },
  how: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1 },
});
