import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { goBackOrHome } from '../platform/navigation';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { iapService, rewardedAds, walletRepository } from '@/config/container';
import {
  canUse,
  SUPPORTER_SKU,
  type IapProduct,
  type StoreCatalog,
  type StoreItem,
  type StoreListing,
  type Wallet,
} from '@/domain/entities/Economy';
import { useSession } from '../state/SessionProvider';
import { useWallet } from '../state/WalletProvider';
import { BOARD_LOOKS, PIECE_LOOKS } from '../theme/cosmetics';
import { colors } from '../theme/colors';

/**
 * Coins buy looks; the pass is a thank-you; ads are a button. Nothing here
 * changes how a game plays. Prices and ownership come from the server on
 * every action, so the screen never guesses.
 */
export function StoreScreen() {
  const { status, session } = useSession();
  const { wallet, adopt } = useWallet();
  const [catalog, setCatalog] = useState<StoreCatalog | null>(null);
  const [listings, setListings] = useState<readonly StoreListing[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!walletRepository) return;
    try {
      const next = await walletRepository.store();
      setCatalog(next);
      adopt(next.wallet);
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Could not load the store.');
    }
  }, [adopt]);

  useEffect(() => {
    if (status !== 'ready') return;
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [status, load]);

  useEffect(() => {
    if (!catalog || !iapService?.supported()) return;
    const skus = catalog.products.map((p) => p.id);
    const timer = setTimeout(() => void iapService?.listings(skus).then(setListings), 0);
    return () => clearTimeout(timer);
  }, [catalog]);

  const run = async (key: string, action: () => Promise<Wallet | null>, done?: string) => {
    setBusy(key);
    setMessage(null);
    try {
      const next = await action();
      if (next) adopt(next);
      if (done) setMessage(done);
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const buy = (item: StoreItem) =>
    walletRepository && run(item.id, () => walletRepository!.buy(item.id));
  const equip = (item: StoreItem) =>
    walletRepository && run(item.id, () => walletRepository!.equip(item.id));
  const earn = () =>
    walletRepository &&
    run('ad', async () => {
      if (!(await rewardedAds.show()))
        throw new Error('The ad did not finish, so nothing was earned.');
      const grant = await walletRepository!.claimAdReward('coins');
      setMessage(`+${grant.granted} coins`);
      return grant.wallet;
    });
  const purchase = (product: IapProduct) =>
    iapService &&
    run(product.id, () => iapService!.purchase(product.id, product.kind === 'coins'), 'Thank you!');
  const restore = () =>
    iapService &&
    run('restore', async () => {
      const next = await iapService!.restore([SUPPORTER_SKU]);
      setMessage(next ? 'Purchases restored.' : 'Nothing to restore on this store account.');
      return next;
    });

  if (status === 'unavailable' || !walletRepository) {
    return (
      <Shell>
        <Text style={styles.note}>This build has no game server, so there is no store.</Text>
      </Shell>
    );
  }
  if (!catalog || !wallet) {
    return (
      <Shell>
        {message ? (
          <Text style={styles.error}>{message}</Text>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </Shell>
    );
  }

  const adsLeft = wallet.caps.coins - wallet.adRewardsToday.coins;
  const priceOf = (sku: string) => listings.find((l) => l.sku === sku)?.price;
  const showProducts = iapService?.supported() && listings.length > 0;

  return (
    <Shell>
      <View style={styles.balance}>
        <Text style={styles.coins}>{wallet.coins} coins</Text>
        {wallet.supporter && <Text style={styles.badge}>Supporter</Text>}
      </View>
      {session?.user.isGuest && (
        <Text style={styles.note}>
          You are playing as a guest: coins stay with this install. The Supporter Pass can always be
          restored from your store account.
        </Text>
      )}
      {message && <Text style={styles.message}>{message}</Text>}

      {rewardedAds.supported() && (
        <Pressable
          onPress={earn}
          disabled={busy !== null || adsLeft <= 0}
          accessibilityRole="button"
          style={[styles.adTile, (busy !== null || adsLeft <= 0) && styles.disabled]}
        >
          <Text style={styles.adTitle}>Watch an ad, earn {wallet.caps.adCoins} coins</Text>
          <Text style={styles.adHint}>
            {adsLeft > 0 ? `${adsLeft} of ${wallet.caps.coins} left today` : 'Back tomorrow'}
          </Text>
        </Pressable>
      )}

      <Section title="Boards">
        {catalog.items
          .filter((i) => i.kind === 'board')
          .map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              wallet={wallet}
              swatch={BOARD_LOOKS[item.id]?.board ?? colors.surface}
              equipped={wallet.equippedBoard === item.id}
              busy={busy === item.id}
              onBuy={() => void buy(item)}
              onEquip={() => void equip(item)}
            />
          ))}
      </Section>

      <Section title="Pieces">
        {catalog.items
          .filter((i) => i.kind === 'pieces')
          .map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              wallet={wallet}
              swatch={PIECE_LOOKS[item.id]?.tiger ?? colors.surface}
              equipped={wallet.equippedPieces === item.id}
              busy={busy === item.id}
              onBuy={() => void buy(item)}
              onEquip={() => void equip(item)}
            />
          ))}
      </Section>

      {showProducts && (
        <Section title="Support the game">
          {catalog.products.map((product) => (
            <View key={product.id} style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>
                  {product.kind === 'pass' ? 'Supporter Pass' : `${product.coins} coins`}
                </Text>
                <Text style={styles.cardHint}>
                  {product.kind === 'pass'
                    ? 'The Golden Dawn board and a Supporter badge. No gameplay advantage, ever.'
                    : 'For looks only.'}
                </Text>
              </View>
              {product.kind === 'pass' && wallet.supporter ? (
                <Text style={styles.owned}>Owned</Text>
              ) : (
                <Action
                  label={priceOf(product.id) ?? '…'}
                  busy={busy === product.id}
                  onPress={() => void purchase(product)}
                />
              )}
            </View>
          ))}
          <Pressable onPress={() => void restore()} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Restore purchases</Text>
          </Pressable>
        </Section>
      )}
    </Shell>
  );
}

function Shell({ children }: { readonly children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => goBackOrHome()} accessibilityRole="button" hitSlop={12}>
          <Text style={styles.back}>‹ Menu</Text>
        </Pressable>
        <Text style={styles.title}>Store</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}

interface ItemCardProps {
  readonly item: StoreItem;
  readonly wallet: Wallet;
  readonly swatch: string;
  readonly equipped: boolean;
  readonly busy: boolean;
  readonly onBuy: () => void;
  readonly onEquip: () => void;
}

function ItemCard({ item, wallet, swatch, equipped, busy, onBuy, onEquip }: ItemCardProps) {
  const usable = canUse(wallet, item);
  return (
    <View
      style={styles.card}
      accessibilityLabel={`${item.name}, ${equipped ? 'equipped' : usable ? 'owned' : `${item.price} coins`}`}
    >
      <View style={[styles.swatch, { backgroundColor: swatch }]} />
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardHint}>
          {item.supporterOnly
            ? 'Supporter Pass perk'
            : item.price === 0
              ? 'Free'
              : `${item.price} coins`}
        </Text>
      </View>
      {equipped ? (
        <Text style={styles.owned}>Equipped</Text>
      ) : usable ? (
        <Action label="Equip" busy={busy} onPress={onEquip} />
      ) : item.supporterOnly ? null : (
        <Action label="Buy" busy={busy} onPress={onBuy} disabled={wallet.coins < item.price} />
      )}
    </View>
  );
}

function Action({
  label,
  busy,
  onPress,
  disabled = false,
}: {
  readonly label: string;
  readonly busy: boolean;
  readonly onPress: () => void;
  readonly disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.action, (busy || disabled) && styles.disabled]}
    >
      {busy ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={styles.actionText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  back: { color: colors.accent, fontSize: 17, fontWeight: '600', paddingVertical: 12 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800' },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  coins: { color: colors.text, fontSize: 22, fontWeight: '800' },
  badge: {
    color: colors.onAccent,
    backgroundColor: colors.selected,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  note: { color: colors.muted, fontSize: 13, marginTop: 10 },
  message: { color: colors.selected, fontSize: 14, marginTop: 10 },
  error: { color: '#ff8a80', fontSize: 14, marginTop: 16 },
  adTile: {
    marginTop: 16,
    backgroundColor: '#3a2d10',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.selected,
  },
  adTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  adHint: { color: colors.muted, fontSize: 13, marginTop: 2 },
  section: { marginTop: 24, gap: 10 },
  heading: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  swatch: { width: 40, height: 40, borderRadius: 10, borderWidth: 2, borderColor: '#00000055' },
  cardText: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  cardHint: { color: colors.muted, fontSize: 13, marginTop: 2 },
  owned: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  action: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    minWidth: 72,
    alignItems: 'center',
  },
  actionText: { color: colors.onAccent, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  link: { color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 6 },
});
