import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import {
  createGame,
  IAP_PRODUCTS,
  PIGGY_CAP,
  seatColors,
  type Friend,
  type IapProduct,
  type StoreListing,
} from '@/domain';
import { friendsRepository, iapService, rewardedAds } from '@/config/container';
import { AdTile } from '../components/AdTile';
import { CoinIcon, GemIcon } from '../components/Currency';
import { ProgressBar, timeLeft } from '../components/Progress';
import {
  COSMETICS,
  cosmeticCurrency,
  isCosmeticEquipped,
  isCosmeticExpired,
  type Cosmetic,
  type CosmeticKind,
} from '@/domain/cosmetics/catalog';
import { Board2D } from '../board/Board2D';
import { BoardThumbnail } from '../board/BoardThumbnail';
import { Dice } from '../components/Dice';
import { Body, Button, Card, Label, Screen, shared, Sheet } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { getBoardTheme, getCardDesign, ui } from '../theme/themes';
import { useCatalogText } from '../i18n/useCatalogText';
import { numberLocale } from '../i18n/format';
const preview = createGame(['RED', 'GREEN', 'YELLOW', 'BLUE']);
/** Table styles only change the 5-6 player table, so that is what they preview. */
const tablePreview = createGame(seatColors(6));
const homeStyleOf = (id: string) =>
  id === 'round-homes' ? ('round' as const) : ('triangle' as const);

type NoticeKey =
  | 'adNotFinished'
  | 'trialStarted'
  | 'trialFailed'
  | 'giftSent'
  | 'giftFailed'
  | 'purchaseDone'
  | 'purchaseFailed'
  | 'equipped'
  | 'saveFailed';
/** A message on screen: a catalogue key (translated while rendering) or server text as sent. */
type Notice = { key: NoticeKey; itemId?: string; friend?: string } | { text: string };
const failure = (e: unknown, key: NoticeKey): Notice =>
  e instanceof Error ? { text: e.message } : { key };

/** Names and blurbs of real-money products, by sku; the domain text for an unknown one. */
function useProductText() {
  const { t } = useTranslation('store');
  const products = t('products', { returnObjects: true }) as Record<
    string,
    { name: string; blurb: string }
  >;
  return {
    name: (product: IapProduct) => products[product.sku]?.name ?? product.name,
    blurb: (product: IapProduct) => products[product.sku]?.blurb ?? product.blurb,
  };
}

export default function StoreScreen() {
  const { profile, theme, member, wallet, purchase, equip, adoptWallet, giftItem, startTrial } =
    useProfile();
  const { t } = useTranslation(['store', 'common']);
  const catalog = useCatalogText();
  const productText = useProductText();
  const noticeText = (notice: Notice) => {
    if ('text' in notice) return notice.text;
    const item = notice.itemId ? COSMETICS.find((c) => c.id === notice.itemId) : undefined;
    return t(`notices.${notice.key}`, {
      name: item ? catalog.cosmeticName(item) : '',
      friend: notice.friend ?? '',
    });
  };
  const signIn = () => router.push({ pathname: '/login', params: { intent: 'store' } });

  // ---- Guests can borrow a paid board for a day after a rewarded ad.
  const [trialBusy, setTrialBusy] = useState(false);
  const trialActive = (id: string) =>
    profile.trialBoard === id &&
    profile.trialUntil !== null &&
    new Date(profile.trialUntil).getTime() > new Date().getTime();
  async function tryLook(id: string) {
    if (trialBusy) return;
    setTrialBusy(true);
    setMessage(null);
    try {
      if (!(await rewardedAds.show())) {
        setMessage({ key: 'adNotFinished' });
        return;
      }
      await startTrial(id);
      setMessage({ key: 'trialStarted' });
      setSelected(null);
    } catch (e) {
      setMessage(failure(e, 'trialFailed'));
    } finally {
      setTrialBusy(false);
    }
  }

  // ---- Gifting: pick a friend, pay their unlock from your balance.
  const [giftOpen, setGiftOpen] = useState(false);
  const [friends, setFriends] = useState<readonly Friend[] | null>(null);
  const [giftBusy, setGiftBusy] = useState<string | null>(null);
  const [giftMessage, setGiftMessage] = useState<Notice | null>(null);
  function openGift() {
    setGiftMessage(null);
    setGiftOpen(true);
    if (friends === null && friendsRepository) {
      void friendsRepository
        .listFriends()
        .then(setFriends)
        .catch(() => setFriends([]));
    }
  }
  async function sendGift(friend: Friend) {
    if (!selected || giftBusy) return;
    setGiftBusy(friend.id);
    setGiftMessage(null);
    try {
      await giftItem(friend.id, selected.id);
      setGiftMessage({
        key: 'giftSent',
        itemId: selected.id,
        friend: friend.displayName || friend.username,
      });
    } catch (e) {
      setGiftMessage(failure(e, 'giftFailed'));
    } finally {
      setGiftBusy(null);
    }
  }

  // ---- The real-money shop: hidden entirely unless the store lists prices.
  const [shopOpen, setShopOpen] = useState(false);
  const [listings, setListings] = useState<readonly StoreListing[]>([]);
  const [shopBusy, setShopBusy] = useState<string | null>(null);
  const [shopMessage, setShopMessage] = useState<Notice | null>(null);
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
  const shopItems = IAP_PRODUCTS.map((product) => ({
    product,
    price: listings.find((l) => l.sku === product.sku)?.price,
  })).filter((entry): entry is { product: (typeof IAP_PRODUCTS)[number]; price: string } =>
    Boolean(entry.price),
  );
  const piggyItem = shopItems.find((x) => x.product.kind === 'piggy');
  const clubItem = shopItems.find((x) => x.product.kind === 'club');
  const bundles = shopItems.filter((x) => x.product.kind !== 'piggy' && x.product.kind !== 'club');
  const clubActive =
    profile.clubUntil !== null && new Date(profile.clubUntil).getTime() > new Date().getTime();
  async function buy(sku: string) {
    if (!iapService || shopBusy) return;
    setShopBusy(sku);
    setShopMessage(null);
    try {
      await adoptWallet(await iapService.purchase(sku));
      setShopMessage({ key: 'purchaseDone' });
    } catch (e) {
      setShopMessage(failure(e, 'purchaseFailed'));
    } finally {
      setShopBusy(null);
    }
  }
  const { width } = useWindowDimensions();
  const [kind, setKind] = useState<CosmeticKind>('pack');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [selected, setSelected] = useState<Cosmetic | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Notice | null>(null);
  // The grid is the heavy part: let the header and tabs paint first, so the
  // tab switch itself feels instant, then fill the cards in.
  const [gridReady, setGridReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setGridReady(true), 0);
    return () => clearTimeout(timer);
  }, []);
  // '◉' is a coin price, '◆' a gem price; legendaries cost gems.
  const mark = (item: Cosmetic) => (cosmeticCurrency(item) === 'gems' ? '◆' : '◉');
  const balanceFor = (item: Cosmetic) =>
    cosmeticCurrency(item) === 'gems' ? profile.gems : profile.coins;
  const paysGems = (item: Cosmetic) => cosmeticCurrency(item) === 'gems';
  const columns = width >= 800 ? 4 : width >= 560 ? 3 : 2;
  const cardWidth = (Math.min(width, 960) - 40 - (columns - 1) * 12) / columns;
  // A past event's look stays visible only for the players who have it.
  const items = COSMETICS.filter(
    (c) =>
      c.kind === kind &&
      (!ownedOnly || profile.owned.includes(c.id)) &&
      (!isCosmeticExpired(c) || profile.owned.includes(c.id)),
  );
  async function confirm() {
    if (!selected || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const owned = profile.owned.includes(selected.id);
      if (!owned && !member) {
        // Coins live on an account; the store sends a guest to get one.
        signIn();
        return;
      }
      // Server first, device second: a refused or lost request changes nothing here.
      await (owned ? equip(selected.id) : purchase(selected.id));
      setMessage({ key: 'equipped', itemId: selected.id });
      setSelected(null);
    } catch (e) {
      setMessage(failure(e, 'saveFailed'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back title={t('title')} subtitle={t('subtitle')}>
      <Body>{t('intro')}</Body>
      <Card style={{ backgroundColor: '#382b4822', borderColor: '#c5a5ff25' }}>
        <View style={shared.between}>
          <View style={{ flex: 1, gap: 8 }}>
            <Label color="#c5a5ff">{t('fair.label')}</Label>
            <Text style={shared.sectionTitle}>{t('fair.title')}</Text>
            <Text style={shared.small}>{t('fair.text')}</Text>
          </View>
          <Text style={{ fontSize: 36, color: '#c5a5ff' }}>✧</Text>
        </View>
      </Card>
      {shopItems.length > 0 && (
        <Card style={{ borderColor: `${ui.gem}40` }}>
          <View style={shared.between}>
            <View style={{ flex: 1, gap: 4 }}>
              <Label color={ui.gem}>{t('topUp.label')}</Label>
              <Text style={shared.sectionTitle}>{t('topUp.title')}</Text>
              <Text style={shared.small}>{t('topUp.text')}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('topUp.openA11y')}
              onPress={() => setShopOpen(true)}
              style={s.shopButton}
            >
              <GemIcon size={16} />
              <Text style={{ color: ui.text, fontWeight: '900' }}>{t('topUp.open')}</Text>
            </Pressable>
          </View>
        </Card>
      )}
      <View style={{ gap: 8 }}>
        <View style={s.tabs}>
          {(['board', 'dice', 'pack', 'style'] as const).map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === tab }}
              onPress={() => setKind(tab)}
              android_ripple={{ color: `${theme.accent}30` }}
              style={[s.tab, kind === tab && { backgroundColor: theme.accent }]}
            >
              <Text style={[s.tabText, kind === tab && { color: '#211d19' }]}>
                {t(`tabs.${tab}`, {
                  total: COSMETICS.filter((item) => item.kind === tab).length,
                })}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ownedOnly }}
          onPress={() => setOwnedOnly(!ownedOnly)}
          android_ripple={{ color: '#ffffff20' }}
          style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-end' }}
        >
          <Text style={[shared.small, ownedOnly && { color: theme.accent }]}>
            {t('ownedFilter', { box: ownedOnly ? '☑' : '☐' })}
          </Text>
        </Pressable>
      </View>
      <View style={s.grid}>
        {(gridReady ? items : []).map((item) => {
          const owned = profile.owned.includes(item.id);
          const equipped = isCosmeticEquipped(profile, item);
          const boardTheme = getBoardTheme(item.contents?.board ?? item.id);
          const name = catalog.cosmeticName(item);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={
                equipped
                  ? t('card.a11yEquipped', { name })
                  : owned
                    ? t('card.a11yOwned', { name })
                    : paysGems(item)
                      ? t('card.a11yPriceGems', { name, count: item.price })
                      : t('card.a11yPriceCoins', { name, count: item.price })
              }
              onPress={() => {
                setSelected(item);
                setMessage(null);
              }}
              android_ripple={{ color: `${theme.accent}25` }}
              style={({ pressed }) => [
                s.product,
                {
                  width: cardWidth,
                  backgroundColor: theme.surface,
                  borderColor: equipped ? `${theme.accent}80` : ui.line,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={[
                  s.preview,
                  {
                    backgroundColor: item.kind === 'board' ? boardTheme.background : '#ffffff05',
                    height: cardWidth * (item.kind === 'pack' ? 1.25 : 0.88),
                  },
                ]}
                pointerEvents="none"
              >
                {item.kind === 'pack' ? (
                  <PackPreview item={item} size={cardWidth * 0.6} thumbnail />
                ) : item.kind === 'board' ? (
                  <View
                    style={{
                      padding: 4,
                      borderRadius: 7,
                      backgroundColor: boardTheme.frame,
                      transform: [{ rotateZ: '-8deg' }],
                    }}
                  >
                    <BoardThumbnail theme={boardTheme} size={cardWidth * 0.65} />
                  </View>
                ) : item.kind === 'style' ? (
                  <Board2D
                    state={tablePreview}
                    size={cardWidth * 0.78}
                    validMoves={null}
                    theme={theme}
                    homeStyle={homeStyleOf(item.id)}
                    onSelectMove={() => undefined}
                  />
                ) : (
                  <View style={{ transform: [{ rotateZ: '-14deg' }, { scale: 1.4 }] }}>
                    <Dice value={5} finish={item.id} />
                  </View>
                )}
                <View style={s.rarity}>
                  <Text
                    style={[
                      s.rarityText,
                      {
                        color:
                          item.rarity === 'Legendary'
                            ? ui.gold
                            : item.rarity === 'Epic'
                              ? '#c5a5ff'
                              : ui.muted,
                      },
                    ]}
                  >
                    {catalog.rarity(item.rarity).toUpperCase()}
                  </Text>
                </View>
                {item.availableUntil && !isCosmeticExpired(item) && (
                  <View style={s.limited}>
                    <Text style={[s.rarityText, { color: '#1f1500' }]}>
                      {t('card.endsIn', { time: timeLeft(item.availableUntil).toUpperCase() })}
                    </Text>
                  </View>
                )}
              </View>
              <View style={s.productInfo}>
                <Text style={s.productTitle}>{name}</Text>
                <Text style={[shared.small, { fontSize: 11 }]} numberOfLines={2}>
                  {catalog.cosmeticDescription(item)}
                </Text>
                <View style={shared.between}>
                  <Text
                    style={{
                      color: equipped ? ui.green : theme.accent,
                      fontSize: 12,
                      fontWeight: '800',
                    }}
                  >
                    {equipped
                      ? t('card.equipped')
                      : owned
                        ? t('card.owned')
                        : `${mark(item)} ${item.price}`}
                  </Text>
                  <Text style={{ color: ui.muted }}>↗</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      {message && !selected && (
        <Text accessibilityLiveRegion="polite" style={[shared.small, { color: ui.green }]}>
          {noticeText(message)}
        </Text>
      )}
      <Text style={[shared.small, { textAlign: 'center' }]}>
        {t('footer.noCashValue')}
        {'\n'}
        {member ? t('footer.member') : t('footer.guest')}
      </Text>
      <Sheet
        visible={shopOpen}
        onClose={() => {
          if (!shopBusy) setShopOpen(false);
        }}
        title={t('shop.title')}
      >
        {clubItem && (
          <Card style={{ padding: 14, gap: 8, borderColor: `${ui.gem}55` }}>
            <View style={shared.between}>
              <View style={{ flex: 1, gap: 4 }}>
                <Label color={ui.gem}>
                  {clubActive ? t('shop.clubMember') : t('shop.subscription')}
                </Label>
                <Text style={{ color: ui.text, fontWeight: '800', fontSize: 15 }}>
                  {productText.name(clubItem.product)}
                </Text>
                <Text style={shared.small}>
                  {clubActive
                    ? t('shop.clubActive', {
                        date: new Date(profile.clubUntil!).toLocaleDateString(numberLocale()),
                      })
                    : productText.blurb(clubItem.product)}
                </Text>
              </View>
              {!clubActive && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('shop.joinClubA11y', { price: clubItem.price })}
                  disabled={shopBusy !== null}
                  onPress={() => void buy(clubItem.product.sku)}
                  style={[s.priceButton, shopBusy !== null && { opacity: 0.5 }]}
                >
                  <Text style={{ color: '#003824', fontWeight: '900' }}>
                    {shopBusy === clubItem.product.sku
                      ? '…'
                      : t('shop.perMonth', { price: clubItem.price })}
                  </Text>
                </Pressable>
              )}
            </View>
          </Card>
        )}
        {piggyItem && (
          <Card style={{ padding: 14, gap: 8, borderColor: `${ui.gold}55` }}>
            <View style={shared.between}>
              <View style={{ flex: 1, gap: 4 }}>
                <Label color={ui.gold}>{t('shop.piggyLabel')}</Label>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <CoinIcon size={15} />
                  <Text style={{ color: ui.text, fontWeight: '800', fontSize: 15 }}>
                    {t('shop.piggySaved', {
                      amount: profile.piggyCoins.toLocaleString(numberLocale()),
                    })}
                  </Text>
                </View>
                <Text style={shared.small}>{productText.blurb(piggyItem.product)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('shop.crackPiggyA11y', { price: piggyItem.price })}
                disabled={shopBusy !== null || profile.piggyCoins < 1000}
                onPress={() => void buy(piggyItem.product.sku)}
                style={[
                  s.priceButton,
                  (shopBusy !== null || profile.piggyCoins < 1000) && { opacity: 0.5 },
                ]}
              >
                <Text style={{ color: '#003824', fontWeight: '900' }}>
                  {shopBusy === piggyItem.product.sku
                    ? '…'
                    : profile.piggyCoins < 1000
                      ? t('shop.piggyFilling')
                      : piggyItem.price}
                </Text>
              </Pressable>
            </View>
            <ProgressBar value={Math.min(1, profile.piggyCoins / PIGGY_CAP)} height={8} />
          </Card>
        )}
        {bundles.map(({ product, price }) => (
          <Card key={product.sku} style={{ padding: 14, gap: 8 }}>
            <View style={shared.between}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: ui.text, fontWeight: '800', fontSize: 15 }}>
                  {productText.name(product)}
                </Text>
                <Text style={shared.small}>{productText.blurb(product)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {product.gems > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <GemIcon size={14} />
                      <Text style={{ color: ui.gem, fontWeight: '800', fontSize: 12 }}>
                        +{product.gems.toLocaleString(numberLocale())}
                      </Text>
                    </View>
                  )}
                  {product.coins > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <CoinIcon size={14} />
                      <Text style={{ color: ui.gold, fontWeight: '800', fontSize: 12 }}>
                        +{product.coins.toLocaleString(numberLocale())}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('shop.buyA11y', { name: productText.name(product), price })}
                disabled={shopBusy !== null}
                onPress={() => void buy(product.sku)}
                style={[s.priceButton, shopBusy !== null && { opacity: 0.5 }]}
              >
                <Text style={{ color: '#003824', fontWeight: '900' }}>
                  {shopBusy === product.sku ? '…' : price}
                </Text>
              </Pressable>
            </View>
          </Card>
        ))}
        {shopMessage && (
          <Text accessibilityLiveRegion="polite" style={[shared.small, { color: ui.green }]}>
            {noticeText(shopMessage)}
          </Text>
        )}
        <Text style={[shared.small, { textAlign: 'center' }]}>{t('shop.note')}</Text>
      </Sheet>
      <Sheet
        visible={selected !== null}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
        title={selected ? catalog.cosmeticName(selected) : t('preview.title')}
      >
        {selected && (
          <>
            <View style={{ alignItems: 'center', padding: 16 }} pointerEvents="none">
              {selected.kind === 'pack' ? (
                <PackPreview item={selected} size={Math.min(width - 150, 230)} />
              ) : selected.kind === 'board' ? (
                <View
                  style={{
                    padding: 7,
                    backgroundColor: getBoardTheme(selected.id).frame,
                    borderRadius: 12,
                  }}
                >
                  <Board2D
                    state={preview}
                    size={Math.min(width - 112, 260)}
                    validMoves={null}
                    theme={getBoardTheme(selected.id)}
                    onSelectMove={() => undefined}
                  />
                </View>
              ) : selected.kind === 'style' ? (
                <Board2D
                  state={tablePreview}
                  size={Math.min(width - 112, 280)}
                  validMoves={null}
                  theme={theme}
                  homeStyle={homeStyleOf(selected.id)}
                  onSelectMove={() => undefined}
                />
              ) : (
                <View style={{ padding: 24, transform: [{ scale: 1.6 }] }}>
                  <Dice value={6} finish={selected.id} />
                </View>
              )}
            </View>
            <Label color={theme.accent}>
              {t('preview.rarityKind', {
                rarity: catalog.rarity(selected.rarity),
                kind: catalog.kind(selected.kind),
              }).toUpperCase()}
            </Label>
            <Body>{catalog.cosmeticDescription(selected)}</Body>
            {selected.contents && (
              <Body>
                {t('preview.includes', {
                  board: (() => {
                    const board = COSMETICS.find((c) => c.id === selected.contents!.board);
                    return board ? catalog.cosmeticName(board) : '';
                  })(),
                })}
              </Body>
            )}
            {!profile.owned.includes(selected.id) && (
              <Card>
                <View style={shared.between}>
                  <Text style={shared.small}>{t('preview.unlockPrice')}</Text>
                  <Text style={{ color: theme.accent, fontWeight: '800' }}>
                    {mark(selected)} {selected.price}
                  </Text>
                </View>
                {!member ? (
                  <Text style={shared.small}>{t('preview.guestNote')}</Text>
                ) : wallet !== 'ready' ? (
                  <Text style={shared.small}>{t('preview.walletFailed')}</Text>
                ) : (
                  <View style={shared.between}>
                    <Text style={shared.small}>{t('preview.balanceAfter')}</Text>
                    <Text
                      style={{
                        color: balanceFor(selected) >= selected.price ? ui.text : ui.danger,
                        fontWeight: '700',
                      }}
                    >
                      {mark(selected)} {balanceFor(selected) - selected.price}
                    </Text>
                  </View>
                )}
              </Card>
            )}
            {message && (
              <Text accessibilityLiveRegion="polite" style={shared.error}>
                {noticeText(message)}
              </Text>
            )}
            <Button
              disabled={
                busy ||
                isCosmeticEquipped(profile, selected) ||
                (!profile.owned.includes(selected.id) &&
                  member &&
                  (wallet !== 'ready' || balanceFor(selected) < selected.price))
              }
              onPress={() => void confirm()}
            >
              {busy
                ? t('preview.saving')
                : isCosmeticEquipped(profile, selected)
                  ? t('preview.currentlyEquipped')
                  : profile.owned.includes(selected.id)
                    ? t('preview.equip')
                    : !member
                      ? t('preview.signIn')
                      : wallet !== 'ready'
                        ? t('preview.reconnect')
                        : balanceFor(selected) < selected.price
                          ? paysGems(selected)
                            ? t('preview.earnMoreGems')
                            : t('preview.earnMoreCoins')
                          : paysGems(selected)
                            ? t('preview.unlockGems', { count: selected.price })
                            : t('preview.unlockCoins', { count: selected.price })}
            </Button>
            {member && selected.price > 0 && !isCosmeticExpired(selected) && (
              <Button secondary onPress={openGift}>
                {paysGems(selected)
                  ? t('preview.giftGems', { count: selected.price })
                  : t('preview.giftCoins', { count: selected.price })}
              </Button>
            )}
            {!member &&
              selected.kind === 'board' &&
              selected.price > 0 &&
              !isCosmeticExpired(selected) &&
              rewardedAds.supported() && (
                <AdTile
                  compact
                  title={
                    trialActive(selected.id)
                      ? t('preview.trialActive', { time: timeLeft(profile.trialUntil!) })
                      : t('preview.trialOffer')
                  }
                  reward={t('preview.trialReward')}
                  caption={
                    trialActive(selected.id)
                      ? t('preview.trialActiveCaption')
                      : t('preview.trialCaption')
                  }
                  busy={trialBusy}
                  disabled={trialActive(selected.id)}
                  onPress={() => void tryLook(selected.id)}
                />
              )}
            <Text style={[shared.small, { textAlign: 'center' }]}>{t('preview.oneUnlock')}</Text>
          </>
        )}
      </Sheet>
      <Sheet
        visible={giftOpen}
        onClose={() => {
          if (!giftBusy) setGiftOpen(false);
        }}
        title={t('gift.title')}
      >
        {selected && (
          <Body>
            {paysGems(selected)
              ? t('gift.bodyGems', {
                  name: catalog.cosmeticName(selected),
                  count: selected.price,
                })
              : t('gift.bodyCoins', {
                  name: catalog.cosmeticName(selected),
                  count: selected.price,
                })}
          </Body>
        )}
        {friends === null && <Text style={shared.small}>{t('gift.loading')}</Text>}
        {friends !== null && friends.length === 0 && (
          <Text style={shared.small}>{t('gift.empty')}</Text>
        )}
        {friends?.map((friend) => (
          <View key={friend.id} style={s.friendRow}>
            <Text numberOfLines={1} style={{ color: ui.text, fontWeight: '700', flex: 1 }}>
              {friend.displayName || friend.username}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('gift.sendA11y', {
                name: friend.displayName || friend.username,
              })}
              disabled={giftBusy !== null}
              onPress={() => void sendGift(friend)}
              style={[s.priceButton, giftBusy !== null && { opacity: 0.5 }]}
            >
              <Text style={{ color: '#003824', fontWeight: '900' }}>
                {giftBusy === friend.id ? '…' : t('gift.send')}
              </Text>
            </Pressable>
          </View>
        ))}
        {giftMessage && (
          <Text accessibilityLiveRegion="polite" style={[shared.small, { color: ui.green }]}>
            {noticeText(giftMessage)}
          </Text>
        )}
      </Sheet>
    </Screen>
  );
}
function PackPreview({
  item,
  size,
  thumbnail = false,
}: {
  item: Cosmetic;
  size: number;
  /** Store cards use the still thumbnail; the detail sheet shows the real board. */
  thumbnail?: boolean;
}) {
  const { t: tr } = useTranslation('store');
  const t = getBoardTheme(item.contents!.board);
  return (
    <View
      style={{
        alignItems: 'center',
        gap: 8,
        padding: 8,
        backgroundColor: t.background,
        borderRadius: 12,
      }}
    >
      {thumbnail ? (
        <BoardThumbnail theme={t} size={size} />
      ) : (
        <Board2D
          state={preview}
          size={size}
          validMoves={null}
          theme={t}
          onSelectMove={() => undefined}
        />
      )}
      <View
        style={[
          {
            width: size,
            backgroundColor: t.surface,
            padding: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          getCardDesign(item.id),
        ]}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ color: t.accent, fontSize: 10, fontWeight: '800' }}>
            {tr('packPreview.player')}
          </Text>
          <Text style={{ color: ui.text, fontSize: 8 }}>{tr('packPreview.yourTurn')}</Text>
        </View>
        <Dice value={5} finish={item.contents!.dice} size={30} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    backgroundColor: '#ffffff06',
    padding: 4,
    borderRadius: 14,
  },
  tab: {
    // Two per row: four categories no longer fit across a phone.
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabText: { color: ui.muted, fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  product: { borderWidth: 1, borderRadius: 17, overflow: 'hidden' },
  preview: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  rarity: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: '#101421dd',
    padding: 5,
    borderRadius: 5,
  },
  rarityText: { fontWeight: '800', fontSize: 7, letterSpacing: 1 },
  limited: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: '#ffcf6f',
    padding: 5,
    borderRadius: 5,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.surfaceLow,
  },
  productInfo: { padding: 13, gap: 9 },
  productTitle: { fontSize: 14, fontWeight: '800', color: ui.text },
  shopButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#9333ea',
    borderBottomWidth: 3,
    borderBottomColor: '#581c87',
  },
  priceButton: {
    minWidth: 84,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: ui.green,
    borderBottomWidth: 3,
    borderBottomColor: '#047857',
  },
});
