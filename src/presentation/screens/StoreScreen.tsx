import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { createGame } from '@/domain';
import { COSMETICS, type Cosmetic, type CosmeticKind } from '@/domain/cosmetics/catalog';
import { profileService } from '@/config/container';
import { Board2D } from '../board/Board2D';
import { Dice } from '../components/Dice';
import { Body, Button, Card, Label, Screen, shared, Sheet } from '../components/Kit';
import { useProfile } from '../state/ProfileProvider';
import { getBoardTheme, ui } from '../theme/themes';
const preview = createGame(['RED', 'GREEN', 'YELLOW', 'BLUE']);
export default function StoreScreen() {
  const { profile, theme, perform } = useProfile();
  const { width } = useWindowDimensions();
  const [kind, setKind] = useState<CosmeticKind>('board');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [selected, setSelected] = useState<Cosmetic | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const columns = width >= 800 ? 4 : width >= 560 ? 3 : 2;
  const cardWidth = (Math.min(width, 960) - 40 - (columns - 1) * 12) / columns;
  const items = COSMETICS.filter(
    (c) => c.kind === kind && (!ownedOnly || profile.owned.includes(c.id)),
  );
  async function confirm() {
    if (!selected || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const owned = profile.owned.includes(selected.id);
      await perform(() =>
        owned ? profileService.equip(selected.id) : profileService.purchase(selected.id),
      );
      setMessage(`${selected.name} is equipped. Make it a good game!`);
      setSelected(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Purchase could not be saved. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="A little more you." subtitle="THE CLUB COLLECTION">
      <Body>
        Your board. Your dice. Your signature move.{'\n'}Unlock a new look with the coins you earn
        by playing.
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
      <View style={shared.between}>
        <View style={s.tabs}>
          {(['board', 'dice'] as const).map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === tab }}
              onPress={() => setKind(tab)}
              style={[s.tab, kind === tab && { backgroundColor: theme.accent }]}
            >
              <Text style={[s.tabText, kind === tab && { color: '#211d19' }]}>
                {tab === 'board' ? 'Boards' : 'Dice'} ·{' '}
                {COSMETICS.filter((item) => item.kind === tab).length}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ownedOnly }}
          onPress={() => setOwnedOnly(!ownedOnly)}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={[shared.small, ownedOnly && { color: theme.accent }]}>
            {ownedOnly ? '☑' : '☐'} Owned
          </Text>
        </Pressable>
      </View>
      <View style={s.grid}>
        {items.map((item) => {
          const owned = profile.owned.includes(item.id);
          const equipped = profile[item.kind] === item.id;
          const boardTheme = getBoardTheme(item.id);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${item.name}, ${equipped ? 'equipped' : owned ? 'owned' : `${item.price} coins`}`}
              onPress={() => {
                setSelected(item);
                setMessage(null);
              }}
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
                    height: cardWidth * 0.88,
                  },
                ]}
                pointerEvents="none"
              >
                {item.kind === 'board' ? (
                  <View
                    style={{
                      padding: 4,
                      borderRadius: 7,
                      backgroundColor: boardTheme.frame,
                      transform: [{ rotateZ: '-8deg' }],
                    }}
                  >
                    <Board2D
                      state={preview}
                      size={cardWidth * 0.65}
                      validMoves={null}
                      theme={boardTheme}
                      onSelectMove={() => undefined}
                    />
                  </View>
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
                    {equipped ? '✓ Equipped' : owned ? 'Owned' : `◉ ${item.price}`}
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
        Coins are earned in this app and have no cash value.{'\n'}Your collection is saved on this
        device.
      </Text>
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
              {selected.kind === 'board' ? (
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
            {!profile.owned.includes(selected.id) && (
              <Card>
                <View style={shared.between}>
                  <Text style={shared.small}>Unlock price</Text>
                  <Text style={{ color: theme.accent, fontWeight: '800' }}>◉ {selected.price}</Text>
                </View>
                <View style={shared.between}>
                  <Text style={shared.small}>Your balance after purchase</Text>
                  <Text
                    style={{
                      color: profile.coins >= selected.price ? ui.text : ui.danger,
                      fontWeight: '700',
                    }}
                  >
                    ◉ {profile.coins - selected.price}
                  </Text>
                </View>
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
                profile[selected.kind] === selected.id ||
                (!profile.owned.includes(selected.id) && profile.coins < selected.price)
              }
              onPress={() => void confirm()}
            >
              {busy
                ? 'Saving…'
                : profile[selected.kind] === selected.id
                  ? '✓ Currently equipped'
                  : profile.owned.includes(selected.id)
                    ? 'Equip this look'
                    : profile.coins < selected.price
                      ? 'Earn more coins to unlock'
                      : `Unlock & equip · ${selected.price} coins`}
            </Button>
            <Text style={[shared.small, { textAlign: 'center' }]}>
              One unlock. Yours on every board view.
            </Text>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
const s = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: '#ffffff06',
    padding: 4,
    borderRadius: 14,
  },
  tab: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10 },
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
  productInfo: { padding: 13, gap: 9 },
  productTitle: { fontSize: 14, fontWeight: '800', color: ui.text },
});
