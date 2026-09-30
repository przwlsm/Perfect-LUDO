import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import {
  createGame,
  IAP_PRODUCTS,
  PIGGY_CAP,
  seatColors,
  type Friend,
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
const preview = createGame(['RED', 'GREEN', 'YELLOW', 'BLUE']);
/** Table styles only change the 5-6 player table, so that is what they preview. */
const tablePreview = createGame(seatColors(6));
const homeStyleOf = (id: string) =>
  id === 'round-homes' ? ('round' as const) : ('triangle' as const);
export default function StoreScreen() {
  const { profile, theme, member, wallet, purchase, equip, adoptWallet, giftItem, startTrial } =
    useProfile();
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
        setMessage('The ad did not finish. Try again in a moment.');
        return;
      }
      await startTrial(id);
      setMessage('Enjoy it for the next 24 hours — sign in to make it yours forever.');
      setSelected(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'The trial could not start.');
    } finally {
      setTrialBusy(false);
    }
  }

  // ---- Gifting: pick a friend, pay their unlock from your balance.
  const [giftOpen, setGiftOpen] = useState(false);
  const [friends, setFriends] = useState<readonly Friend[] | null>(null);
  const [giftBusy, setGiftBusy] = useState<string | null>(null);
  const [giftMessage, setGiftMessage] = useState<string | null>(null);
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
      setGiftMessage(`${selected.name} is on its way to ${friend.displayName || friend.username}!`);
    } catch (e) {
      setGiftMessage(e instanceof Error ? e.message : 'The gift could not be sent.');
    } finally {
      setGiftBusy(null);
    }
  }

  // ---- The real-money shop: hidden entirely unless the store lists prices.
  const [shopOpen, setShopOpen] = useState(false);
  const [listings, setListings] = useState<readonly StoreListing[]>([]);
  const [shopBusy, setShopBusy] = useState<string | null>(null);
  const [shopMessage, setShopMessage] = useState<string | null>(null);
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
      setShopMessage('Purchase complete. Enjoy!');
    } catch (e) {
      setShopMessage(e instanceof Error ? e.message : 'The purchase did not go through.');
    } finally {
      setShopBusy(null);
    }
  }
  const { width } = useWindowDimensions();
  const [kind, setKind] = useState<CosmeticKind>('pack');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [selected, setSelected] = useState<Cosmetic | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
      setMessage(`${selected.name} is equipped. Make it a good game!`);
      setSelected(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Purchase could not be saved. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back title="A little more you." subtitle="THE CLUB COLLECTION">
      <Body>
        Individual boards. Signature dice. Complete theme packs.{'\n'}Unlock a new look with the
        coins you earn by playing.
      </Body>
      <Card style={{ backgroundColor: '#382b4822', borderColor: '#c5a5ff25' }}>
        <View style={shared.between}>
          <View style={{ flex: 1, gap: 8 }}>
            <Label color="#c5a5ff">EVERY LOOK. THE SAME FAIR GAME.</Label>
            <Text style={shared.sectionTitle}>Style is the only advantage.</Text>
            <Text style={shared.small}>
              All cosmetics work in 2D and 3D. Dice finishes never change the odds.
            </Text>
          </View>
          <Text style={{ fontSize: 36, color: '#c5a5ff' }}>✧</Text>
        </View>
      </Card>
      {shopItems.length > 0 && (
        <Card style={{ borderColor: `${ui.gem}40` }}>
          <View style={shared.between}>
            <View style={{ flex: 1, gap: 4 }}>
              <Label color={ui.gem}>TOP UP</Label>
              <Text style={shared.sectionTitle}>Get gems & coins</Text>
              <Text style={shared.small}>
                Skip the grind when you feel like it — playing always stays free.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open the top up shop"
              onPress={() => setShopOpen(true)}
              style={s.shopButton}
            >
              <GemIcon size={16} />
              <Text style={{ color: ui.text, fontWeight: '900' }}>Shop</Text>
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
                {tab === 'board'
                  ? 'Boards'
                  : tab === 'dice'
                    ? 'Dice'
                    : tab === 'pack'
                      ? 'Theme Packs'
                      : 'Table styles'}{' '}
                · {COSMETICS.filter((item) => item.kind === tab).length}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ownedOnly }}
          onPress={() => setOwnedOnly(!ownedOnly)}
          android_ripple={{ color: '#ffffff20' }}
          style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-end' }}
        >
          <Text style={[shared.small, ownedOnly && { color: theme.accent }]}>
            {ownedOnly ? '☑' : '☐'} Owned
          </Text>
        </Pressable>
      </View>
      <View style={s.grid}>
        {(gridReady ? items : []).map((item) => {
          const owned = profile.owned.includes(item.id);
          const equipped = isCosmeticEquipped(profile, item);
          const boardTheme = getBoardTheme(item.contents?.board ?? item.id);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${item.name}, ${equipped ? 'equipped' : owned ? 'owned' : `${item.price} ${cosmeticCurrency(item)}`}`}
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
                    {item.rarity.toUpperCase()}
                  </Text>
                </View>
                {item.availableUntil && !isCosmeticExpired(item) && (
                  <View style={s.limited}>
                    <Text style={[s.rarityText, { color: '#1f1500' }]}>
                      ENDS IN {timeLeft(item.availableUntil).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={s.productInfo}>
                <Text style={s.productTitle}>{item.name}</Text>
                <Text style={[shared.small, { fontSize: 11 }]} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={shared.between}>
                  <Text
                    style={{
                      color: equipped ? ui.green : theme.accent,
                      fontSize: 12,
                      fontWeight: '800',
                    }}
                  >
                    {equipped ? '✓ Equipped' : owned ? 'Owned' : `${mark(item)} ${item.price}`}
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
          {message}
        </Text>
      )}
      <Text style={[shared.small, { textAlign: 'center' }]}>
        Coins are earned in this app and have no cash value.{'\n'}
        {member
          ? 'Your coins and collection are kept on your account.'
          : 'Sign in to unlock looks; coins and your collection stay on your account.'}
      </Text>
      <Sheet
        visible={shopOpen}
        onClose={() => {
          if (!shopBusy) setShopOpen(false);
        }}
        title="Top up"
      >
        {clubItem && (
          <Card style={{ padding: 14, gap: 8, borderColor: `${ui.gem}55` }}>
            <View style={shared.between}>
              <View style={{ flex: 1, gap: 4 }}>
                <Label color={ui.gem}>{clubActive ? 'CLUB MEMBER' : 'SUBSCRIPTION'}</Label>
                <Text style={{ color: ui.text, fontWeight: '800', fontSize: 15 }}>
                  {clubItem.product.name}
                </Text>
                <Text style={shared.small}>
                  {clubActive
                    ? `Active until ${new Date(profile.clubUntil!).toLocaleDateString()}. Extra spins are free and every gift brings gems.`
                    : clubItem.product.blurb}
                </Text>
              </View>
              {!clubActive && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Join Ludo Club for ${clubItem.price} a month`}
                  disabled={shopBusy !== null}
                  onPress={() => void buy(clubItem.product.sku)}
                  style={[s.priceButton, shopBusy !== null && { opacity: 0.5 }]}
                >
                  <Text style={{ color: '#003824', fontWeight: '900' }}>
                    {shopBusy === clubItem.product.sku ? '…' : `${clubItem.price}/mo`}
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
                <Label color={ui.gold}>PIGGY BANK</Label>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <CoinIcon size={15} />
                  <Text style={{ color: ui.text, fontWeight: '800', fontSize: 15 }}>
                    {profile.piggyCoins.toLocaleString()} saved
                  </Text>
                </View>
                <Text style={shared.small}>{piggyItem.product.blurb}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Crack the piggy bank open for ${piggyItem.price}`}
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
                      ? 'Filling…'
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
                  {product.name}
                </Text>
                <Text style={shared.small}>{product.blurb}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {product.gems > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <GemIcon size={14} />
                      <Text style={{ color: ui.gem, fontWeight: '800', fontSize: 12 }}>
                        +{product.gems.toLocaleString()}
                      </Text>
                    </View>
                  )}
                  {product.coins > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <CoinIcon size={14} />
                      <Text style={{ color: ui.gold, fontWeight: '800', fontSize: 12 }}>
                        +{product.coins.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Buy ${product.name} for ${price}`}
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
            {shopMessage}
          </Text>
        )}
        <Text style={[shared.small, { textAlign: 'center' }]}>
          Payments go through your app store. Coins and gems are for playing here — they never
          convert back to money.
        </Text>
      </Sheet>
      <Sheet
        visible={selected !== null}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
        title={selected?.name ?? 'Preview'}
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
              {selected.rarity.toUpperCase()} {selected.kind.toUpperCase()}
            </Label>
            <Body>{selected.description}</Body>
            {selected.contents && (
              <Body>
                Includes {COSMETICS.find((c) => c.id === selected.contents!.board)?.name}, matching
                dice, and coordinated player cards. Equip the full look together or mix its board
                and dice with your collection.
              </Body>
            )}
            {!profile.owned.includes(selected.id) && (
              <Card>
                <View style={shared.between}>
                  <Text style={shared.small}>Unlock price</Text>
                  <Text style={{ color: theme.accent, fontWeight: '800' }}>
                    {mark(selected)} {selected.price}
                  </Text>
                </View>
                {!member ? (
                  <Text style={shared.small}>
                    Coins and unlocked looks are kept on your account. Sign in to use them here.
                  </Text>
                ) : wallet !== 'ready' ? (
                  <Text style={shared.small}>
                    Your coins could not be loaded. Reconnect and try again before unlocking.
                  </Text>
                ) : (
                  <View style={shared.between}>
                    <Text style={shared.small}>Your balance after purchase</Text>
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
                {message}
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
                ? 'Saving…'
                : isCosmeticEquipped(profile, selected)
                  ? '✓ Currently equipped'
                  : profile.owned.includes(selected.id)
                    ? 'Equip this look'
                    : !member
                      ? 'Sign in to unlock'
                      : wallet !== 'ready'
                        ? 'Reconnect to unlock'
                        : balanceFor(selected) < selected.price
                          ? `Earn more ${cosmeticCurrency(selected)} to unlock`
                          : `Unlock & equip · ${selected.price} ${cosmeticCurrency(selected)}`}
            </Button>
            {member && selected.price > 0 && !isCosmeticExpired(selected) && (
              <Button secondary onPress={openGift}>
                {`Gift to a friend · ${selected.price} ${cosmeticCurrency(selected)}`}
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
                      ? `Trying it now · ${timeLeft(profile.trialUntil!)} left`
                      : 'Try it free for 24 hours'
                  }
                  reward="Watch one short ad"
                  caption={
                    trialActive(selected.id)
                      ? 'Enjoy! Sign in any time to make it yours forever.'
                      : 'The whole app dresses in this board for a day.'
                  }
                  busy={trialBusy}
                  disabled={trialActive(selected.id)}
                  onPress={() => void tryLook(selected.id)}
                />
              )}
            <Text style={[shared.small, { textAlign: 'center' }]}>
              One unlock. Yours on every board view.
            </Text>
          </>
        )}
      </Sheet>
      <Sheet
        visible={giftOpen}
        onClose={() => {
          if (!giftBusy) setGiftOpen(false);
        }}
        title="Send as a gift"
      >
        {selected && (
          <Body>
            {selected.name} · {selected.price} {cosmeticCurrency(selected)} from your balance. Your
            friend keeps it forever.
          </Body>
        )}
        {friends === null && <Text style={shared.small}>Loading your friends…</Text>}
        {friends !== null && friends.length === 0 && (
          <Text style={shared.small}>
            No friends yet — add some from the Friends screen and share the fun.
          </Text>
        )}
        {friends?.map((friend) => (
          <View key={friend.id} style={s.friendRow}>
            <Text numberOfLines={1} style={{ color: ui.text, fontWeight: '700', flex: 1 }}>
              {friend.displayName || friend.username}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Send to ${friend.displayName || friend.username}`}
              disabled={giftBusy !== null}
              onPress={() => void sendGift(friend)}
              style={[s.priceButton, giftBusy !== null && { opacity: 0.5 }]}
            >
              <Text style={{ color: '#003824', fontWeight: '900' }}>
                {giftBusy === friend.id ? '…' : 'Send'}
              </Text>
            </Pressable>
          </View>
        ))}
        {giftMessage && (
          <Text accessibilityLiveRegion="polite" style={[shared.small, { color: ui.green }]}>
            {giftMessage}
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
          <Text style={{ color: t.accent, fontSize: 10, fontWeight: '800' }}>PLAYER</Text>
          <Text style={{ color: ui.text, fontSize: 8 }}>Your turn</Text>
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
    alignItems: 'center',
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
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: ui.green,
    borderBottomWidth: 3,
    borderBottomColor: '#047857',
  },
});
