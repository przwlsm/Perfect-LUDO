import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AD_RESCUE_BOOST_COINS,
  AD_REWARD_CAPS,
  EXTRA_SPIN_GEMS,
  GIFT_CYCLE_COINS,
  GIFT_STREAK_GEMS,
  giftCalendar,
  GUEST_VAULT_AD_COINS,
  GUEST_VAULT_ADS_PER_DAY,
  GUEST_VAULT_CAP,
  GUEST_VAULT_WIN,
  RESCUE_COINS,
  RESCUE_THRESHOLD,
  SEASON_PREMIUM_GEMS,
  SEASON_TIER_XP,
  SEASON_TIERS,
  SPIN_SLOTS,
  SPINS_PER_DAY,
  seasonTierReward,
  type AdRewardKind,
  type Mission,
  type SpinResult,
} from '@/domain';
import { rewardedAds } from '@/config/container';
import { Text } from '../components/AppText';
import { Body, Button, Card, Label, Screen, shared, Sheet } from '../components/Kit';
import { CoinIcon, GemIcon } from '../components/Currency';
import { AdTile } from '../components/AdTile';
import { LuckyWheel } from '../components/LuckyWheel';
import { Shine } from '../components/Live';
import { ProgressBar, RewardChips, timeLeft } from '../components/Progress';
import { useRewards } from '../hooks/useRewards';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

export default function RewardsScreen() {
  const { theme, profile, member, claimGift, claimRescue, claimVault } = useProfile();
  const rewards = useRewards();
  const [busy, setBusy] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const motionEnabled = useMotionEnabled(profile.reducedMotion, true);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [landing, setLanding] = useState<SpinResult | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [revealed, setRevealed] = useState<SpinResult | null>(null);

  if (!member) return <GuestRewards />;

  const data = rewards.data;
  const spinsToday = data?.spinsToday ?? 0;
  const freeSpin = spinsToday === 0;
  const canSpin = spinsToday < SPINS_PER_DAY && (freeSpin || profile.gems >= EXTRA_SPIN_GEMS);

  async function spin() {
    setRevealed(null);
    const result = await rewards.spin();
    if (!result) return;
    setLanding(result);
    setSpinKey((k) => k + 1);
  }

  // The wheel is still turning toward a prize the server already chose.
  const spinning = landing !== null && revealed !== landing;
  const season = data?.season;
  const tierReached = season ? Math.min(SEASON_TIERS, Math.floor(season.xp / SEASON_TIER_XP)) : 0;
  const intoTier = season ? season.xp - tierReached * SEASON_TIER_XP : 0;

  const todayUtc = new Date().toISOString().slice(0, 10);
  const gift = giftCalendar(profile.lastGift, profile.giftStreak, todayUtc);
  const rescueUsed = profile.lastRescue !== null && profile.lastRescue >= todayUtc;

  async function claim(kind: 'gift' | 'rescue' | 'vault') {
    setBusy(kind);
    setClaimError(null);
    try {
      await (kind === 'gift' ? claimGift() : kind === 'rescue' ? claimRescue() : claimVault());
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : 'Could not claim that right now.');
    } finally {
      setBusy(null);
    }
  }

  const adsOk = rewardedAds.supported();
  const adsUsed = data?.ads ?? { gem: 0, spin: 0, 'rescue-boost': 0 };
  const adsLeft = (kind: AdRewardKind) => Math.max(0, AD_REWARD_CAPS[kind] - adsUsed[kind]);

  /** Shows one rewarded ad; the server pays only when the view finished. */
  async function watchAd(kind: AdRewardKind): Promise<boolean> {
    setBusy(`ad:${kind}`);
    setClaimError(null);
    try {
      if (!(await rewardedAds.show())) {
        setClaimError('The ad did not finish. Try again in a moment.');
        return false;
      }
      return (await rewards.claimAdReward(kind)) !== null;
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen title="Rewards" subtitle="SPIN · MISSIONS · SEASON PASS">
      {rewards.error && <Text style={shared.error}>{rewards.error}</Text>}

      {/* ---- Guest vault carried onto this account ---- */}
      {profile.vaultCoins > 0 && (
        <Card style={{ borderColor: ui.gold, backgroundColor: '#2a2210' }}>
          <View style={shared.between}>
            <View style={{ flex: 1, gap: 4 }}>
              <Label color={ui.gold}>YOUR GUEST WINNINGS</Label>
              <Text style={shared.sectionTitle}>
                {profile.vaultCoins.toLocaleString()} coins from before you signed in
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Claim ${profile.vaultCoins} vault coins`}
              disabled={busy !== null}
              onPress={() => void claim('vault')}
              style={[s.rescueButton, busy !== null && { opacity: 0.5 }]}
            >
              <CoinIcon size={18} />
              <Text style={{ color: '#3b2400', fontWeight: '900' }}>
                {busy === 'vault' ? '…' : 'Claim'}
              </Text>
            </Pressable>
          </View>
        </Card>
      )}

      {/* ---- Daily reward calendar ---- */}
      <Card style={{ borderColor: `${ui.green}40` }}>
        <View style={{ gap: 4 }}>
          <Label color={ui.green}>DAILY REWARD</Label>
          <Text style={shared.sectionTitle}>
            {gift.claimedToday
              ? `Day ${gift.day} collected — back tomorrow`
              : `Day ${gift.day} is ready`}
          </Text>
        </View>
        <View style={s.giftRow}>
          {GIFT_CYCLE_COINS.map((coins, i) => {
            const day = i + 1;
            const collected = day < gift.day || (gift.claimedToday && day === gift.day);
            const active = !gift.claimedToday && day === gift.day;
            return (
              <View
                key={day}
                style={[
                  s.giftDay,
                  collected && { opacity: 0.45 },
                  active && { borderColor: ui.green, boxShadow: `0 0 10px ${ui.green}55` },
                ]}
              >
                <Text style={s.giftDayLabel}>D{day}</Text>
                {day === 7 ? <GemIcon size={14} /> : <CoinIcon size={14} />}
                <Text style={s.giftDayAmount}>{day === 7 ? `+${GIFT_STREAK_GEMS}` : coins}</Text>
                {collected && <Ionicons name="checkmark" size={12} color={ui.green} />}
              </View>
            );
          })}
        </View>
        <Text style={shared.small}>
          Claim every day to climb the calendar. Day 7 pays {GIFT_CYCLE_COINS[6]} coins and{' '}
          {GIFT_STREAK_GEMS} gems — miss a day and it starts over.
        </Text>
        <Button disabled={gift.claimedToday || busy !== null} onPress={() => void claim('gift')}>
          {busy === 'gift'
            ? 'Claiming…'
            : gift.claimedToday
              ? 'Collected — back tomorrow'
              : `Claim day ${gift.day} · ${GIFT_CYCLE_COINS[gift.day - 1]} coins${gift.day === 7 ? ` + ${GIFT_STREAK_GEMS} gems` : ''}`}
        </Button>
      </Card>

      {/* ---- Comeback rescue: only while nearly broke ---- */}
      {profile.coins < RESCUE_THRESHOLD &&
        (() => {
          const boost = rescueUsed && adsOk && adsLeft('rescue-boost') > 0;
          const spent = rescueUsed && !boost;
          return (
            <Card style={{ borderColor: `${ui.gold}55` }}>
              <View style={shared.between}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Label color={ui.gold}>COMEBACK RESCUE</Label>
                  <Text style={shared.sectionTitle}>Low on coins?</Text>
                  <Text style={shared.small}>
                    {boost
                      ? `Watch an ad to add ${AD_RESCUE_BOOST_COINS} more coins to today’s rescue.`
                      : spent
                        ? 'Today’s rescue is used. Free tables always stay open.'
                        : `Claim ${RESCUE_COINS} coins to get back to the tables. Once a day.`}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    boost
                      ? `Watch an ad for ${AD_RESCUE_BOOST_COINS} more coins`
                      : `Claim ${RESCUE_COINS} rescue coins`
                  }
                  disabled={spent || busy !== null}
                  onPress={() => void (boost ? watchAd('rescue-boost') : claim('rescue'))}
                  style={[s.rescueButton, (spent || busy !== null) && { opacity: 0.5 }]}
                >
                  {boost && <Ionicons name="play-circle" size={18} color="#3b2400" />}
                  <CoinIcon size={18} />
                  <Text style={{ color: '#3b2400', fontWeight: '900' }}>
                    {busy === 'rescue' || busy === 'ad:rescue-boost'
                      ? '…'
                      : `+${boost ? AD_RESCUE_BOOST_COINS : RESCUE_COINS}`}
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        })()}
      {claimError && <Text style={shared.error}>{claimError}</Text>}

      {/* ---- Daily lucky spin ---- */}
      <Card style={{ borderColor: `${ui.gold}40` }}>
        <View style={shared.between}>
          <View style={{ flex: 1, gap: 6 }}>
            <Label color={ui.gold}>DAILY LUCKY SPIN</Label>
            <Text style={shared.sectionTitle}>Spin to win up to 1,000 coins</Text>
            <View style={[shared.row, { gap: 6 }]}>
              {Array.from({ length: 7 }, (_, i) => (
                <View
                  key={i}
                  style={[
                    s.streakDot,
                    i < (profile.spinStreak % 7 || (profile.spinStreak && !freeSpin ? 7 : 0)) && {
                      backgroundColor: ui.gold,
                    },
                  ]}
                />
              ))}
              <Text style={shared.small}>Day 7: +25 gems</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open the lucky wheel"
            onPress={() => setWheelOpen(true)}
            style={s.wheelThumb}
          >
            <Ionicons name="sync-circle" size={46} color={ui.gold} />
          </Pressable>
        </View>
        <Button onPress={() => setWheelOpen(true)}>
          {freeSpin
            ? 'Free spin ready'
            : spinsToday < SPINS_PER_DAY
              ? `Extra spin · ${EXTRA_SPIN_GEMS} gems`
              : 'Back tomorrow'}
        </Button>
      </Card>

      {/* ---- Free gems for a rewarded ad ---- */}
      {adsOk && (
        <AdTile
          title="Watch an ad, earn a gem"
          reward="+1 gem"
          icon="gem"
          caption={
            adsLeft('gem') > 0
              ? 'About 30 seconds. Always your choice.'
              : 'All collected for today — back tomorrow.'
          }
          busy={busy === 'ad:gem'}
          disabled={adsLeft('gem') <= 0 || busy !== null}
          left={adsLeft('gem')}
          total={AD_REWARD_CAPS.gem}
          onPress={() => void watchAd('gem')}
        />
      )}

      {/* ---- Daily missions ---- */}
      <View style={shared.section}>
        <View style={shared.between}>
          <Text style={shared.sectionTitle}>Today&apos;s missions</Text>
          {data && <Text style={shared.small}>New in {timeLeft(data.missionsResetAt)}</Text>}
        </View>
        {(data?.missions ?? []).map((mission) => (
          <MissionRow
            key={mission.id}
            mission={mission}
            busy={rewards.busy === `mission:${mission.id}`}
            onClaim={() => void rewards.claimMission(mission.id)}
          />
        ))}
        {!data && !rewards.error && <Text style={shared.small}>Loading your missions…</Text>}
      </View>

      {/* ---- Season pass ---- */}
      {season && (
        <Card style={{ borderColor: `${ui.blue}40` }}>
          <View style={shared.between}>
            <View style={{ gap: 4 }}>
              <Label color={ui.blueSoft}>SEASON {season.number} PASS</Label>
              <Text style={shared.sectionTitle}>
                Tier {tierReached} / {SEASON_TIERS}
              </Text>
            </View>
            <Text style={shared.small}>Ends in {timeLeft(season.endsAt)}</Text>
          </View>
          <ProgressBar value={tierReached >= SEASON_TIERS ? 1 : intoTier / SEASON_TIER_XP} />
          <Text style={shared.small}>
            {tierReached >= SEASON_TIERS
              ? 'Every tier reached. Legendary.'
              : `${intoTier} / ${SEASON_TIER_XP} XP to tier ${tierReached + 1}. Every match earns season XP.`}
          </Text>
          {!season.premium && (
            <View style={s.premiumBox}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[shared.sectionTitle, { fontSize: 16 }]}>
                  Unlock the premium track
                </Text>
                <Text style={shared.small}>More coins on every tier and 40 gems every fifth.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Unlock premium for ${SEASON_PREMIUM_GEMS} gems`}
                disabled={rewards.busy !== null || profile.gems < SEASON_PREMIUM_GEMS}
                onPress={() => void rewards.buyPremium()}
                style={[s.gemButton, profile.gems < SEASON_PREMIUM_GEMS && { opacity: 0.5 }]}
              >
                <GemIcon size={18} />
                <Text style={{ color: ui.text, fontWeight: '800' }}>{SEASON_PREMIUM_GEMS}</Text>
              </Pressable>
            </View>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {Array.from({ length: SEASON_TIERS }, (_, i) => i + 1).map((tier) => (
              <TierColumn
                key={tier}
                tier={tier}
                reached={tier <= tierReached}
                premium={season.premium}
                freeClaimed={season.freeClaimed.includes(tier)}
                premiumClaimed={season.premiumClaimed.includes(tier)}
                busy={rewards.busy}
                accent={theme.accent}
                onClaim={(premium) => void rewards.claimTier(tier, premium)}
              />
            ))}
          </ScrollView>
        </Card>
      )}

      <Sheet
        visible={wheelOpen}
        onClose={() => {
          if (rewards.busy === 'spin') return;
          // Closed mid-spin: the prize is already won, so settle it now.
          if (landing && !revealed) setRevealed(landing);
          setWheelOpen(false);
        }}
        title="Lucky spin"
      >
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <LuckyWheel
            size={260}
            landOn={landing?.reward.slot ?? null}
            spinKey={spinKey}
            motionEnabled={motionEnabled}
            onLanded={() => setRevealed(landing)}
          />
        </View>
        {revealed ? (
          <View style={s.prize}>
            <Label color={ui.gold}>YOU WON</Label>
            <View style={[shared.row, { justifyContent: 'center' }]}>
              {revealed.reward.kind === 'coins' ? (
                <CoinIcon size={30} />
              ) : revealed.reward.kind === 'gems' ? (
                <GemIcon size={30} />
              ) : null}
              <Text style={s.prizeText}>
                {revealed.reward.amount.toLocaleString()}{' '}
                {revealed.reward.kind === 'xp' ? 'XP' : revealed.reward.kind}
              </Text>
            </View>
            {revealed.reward.streakBonus > 0 && (
              <Text style={{ color: ui.gem, fontWeight: '800', textAlign: 'center' }}>
                7-day streak bonus: +{revealed.reward.streakBonus} gems
              </Text>
            )}
          </View>
        ) : (
          <Text style={[shared.small, { textAlign: 'center' }]}>
            {SPIN_SLOTS.length} prizes on the wheel. One free spin a day, up to {SPINS_PER_DAY - 1}{' '}
            more for {EXTRA_SPIN_GEMS} gems each.
          </Text>
        )}
        <Button
          disabled={!canSpin || rewards.busy !== null || spinning}
          onPress={() => void spin()}
        >
          {rewards.busy === 'spin' || spinning
            ? 'Spinning…'
            : freeSpin
              ? 'Spin free'
              : spinsToday < SPINS_PER_DAY
                ? `Spin again · ${EXTRA_SPIN_GEMS} gems`
                : 'No spins left today'}
        </Button>
        {adsOk && !freeSpin && spinsToday < SPINS_PER_DAY && adsLeft('spin') > 0 && (
          <AdTile
            compact
            title="Spin free instead"
            reward="Watch one short ad"
            busy={busy === 'ad:spin'}
            disabled={busy !== null || rewards.busy !== null || spinning}
            left={adsLeft('spin')}
            total={AD_REWARD_CAPS.spin}
            onPress={() =>
              void watchAd('spin').then((ok) => {
                if (ok) void spin();
              })
            }
          />
        )}
        {rewards.error && <Text style={shared.error}>{rewards.error}</Text>}
      </Sheet>
    </Screen>
  );
}

/**
 * The guest Rewards screen: everything earned goes into a locked vault that
 * signing in pays out. Playing fills it; up to three opt-in ads a day top
 * it up faster. Nothing here ever plays an ad uninvited.
 */
function GuestRewards() {
  const { profile, claimGuestAd } = useProfile();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const motion = useMotionEnabled(profile.reducedMotion, true);
  const adsOk = rewardedAds.supported();
  const todayUtc = new Date().toISOString().slice(0, 10);
  const adsUsed = profile.vaultAdDay === todayUtc ? profile.vaultAdsToday : 0;
  const adsLeft = Math.max(0, GUEST_VAULT_ADS_PER_DAY - adsUsed);
  const full = profile.vaultCoins >= GUEST_VAULT_CAP;

  async function watchAd() {
    setBusy(true);
    setNotice(null);
    try {
      if (!(await rewardedAds.show())) {
        setNotice('The ad did not finish. Try again in a moment.');
        return;
      }
      await claimGuestAd();
      setNotice(`+${GUEST_VAULT_AD_COINS} coins in your vault!`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not add that right now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Rewards" subtitle="YOUR VAULT IS FILLING">
      <View style={s.vaultCard}>
        <LinearGradient
          colors={['#3d2f0f', '#221a0a', '#1a1408']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.vaultInner}
        >
          <Shine active={motion} width={360} every={2600} />
          <View style={shared.between}>
            <View style={[shared.row, { gap: 10 }]}>
              <View style={s.vaultBadge}>
                <Ionicons name="lock-closed" size={22} color="#3b2400" />
              </View>
              <View>
                <Label color={ui.gold}>YOUR VAULT</Label>
                <Text style={{ color: ui.muted, fontSize: 11, fontWeight: '700' }}>
                  Everything here becomes yours
                </Text>
              </View>
            </View>
            <Text style={{ color: ui.subtle, fontSize: 10, fontWeight: '800' }}>
              MAX {GUEST_VAULT_CAP.toLocaleString()}
            </Text>
          </View>
          <View style={[shared.row, { justifyContent: 'center', gap: 10, paddingVertical: 6 }]}>
            <CoinIcon size={34} />
            <Text style={s.vaultAmount}>{profile.vaultCoins.toLocaleString()}</Text>
          </View>
          <ProgressBar
            value={Math.min(1, profile.vaultCoins / GUEST_VAULT_CAP)}
            colors={[ui.gold, '#f59e0b']}
            height={10}
          />
          <Text style={[shared.small, { textAlign: 'center' }]}>
            {full
              ? 'Your vault is full! Sign in to claim it all.'
              : `Win a game: +${GUEST_VAULT_WIN} coins. It all unlocks the moment you sign in.`}
          </Text>
          <Button onPress={() => router.push({ pathname: '/login', params: { intent: 'store' } })}>
            {profile.vaultCoins > 0
              ? `Sign in & claim ${profile.vaultCoins.toLocaleString()} coins`
              : 'Sign in to start earning'}
          </Button>
        </LinearGradient>
      </View>

      {adsOk && (
        <AdTile
          title="Watch an ad"
          reward={`+${GUEST_VAULT_AD_COINS} to your vault`}
          icon="coin"
          caption={
            full
              ? 'Your vault is full — sign in to claim it first.'
              : adsLeft > 0
                ? 'About 30 seconds. Always your choice.'
                : 'All collected for today — back tomorrow.'
          }
          busy={busy}
          disabled={adsLeft <= 0 || full}
          left={adsLeft}
          total={GUEST_VAULT_ADS_PER_DAY}
          onPress={() => void watchAd()}
        />
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={[shared.small, { color: ui.green }]}>
          {notice}
        </Text>
      )}

      <Card>
        <Text style={shared.sectionTitle}>An account unlocks the rest</Text>
        <Body>
          The lucky wheel, daily missions, the season pass, leagues, gems and online tables for
          coins — all of it lives on your free account, along with everything in your vault.
        </Body>
      </Card>
    </Screen>
  );
}

function MissionRow({
  mission,
  busy,
  onClaim,
}: {
  mission: Mission;
  busy: boolean;
  onClaim(): void;
}) {
  const done = mission.progress >= mission.target;
  return (
    <Card
      style={{
        padding: 14,
        gap: 10,
        borderColor: done && !mission.claimed ? `${ui.green}66` : ui.line,
      }}
    >
      <View style={shared.between}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: ui.text, fontWeight: '700', fontSize: 15 }}>{mission.title}</Text>
          <RewardChips coins={mission.coins} gems={mission.gems} xp={mission.xp} size="sm" />
        </View>
        {mission.claimed ? (
          <View style={[shared.row, { gap: 4 }]}>
            <Ionicons name="checkmark-circle" size={20} color={ui.green} />
            <Text style={{ color: ui.green, fontWeight: '800', fontSize: 12 }}>Claimed</Text>
          </View>
        ) : done ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Claim ${mission.title}`}
            disabled={busy}
            onPress={onClaim}
            style={s.claim}
          >
            <Text style={{ color: '#003824', fontWeight: '900', fontSize: 13 }}>
              {busy ? '…' : 'CLAIM'}
            </Text>
          </Pressable>
        ) : (
          <Text style={{ color: ui.muted, fontWeight: '800' }}>
            {mission.progress}/{mission.target}
          </Text>
        )}
      </View>
      {!mission.claimed && (
        <ProgressBar
          value={mission.progress / mission.target}
          colors={[ui.green, '#10b981']}
          height={8}
        />
      )}
    </Card>
  );
}

function TierColumn({
  tier,
  reached,
  premium,
  freeClaimed,
  premiumClaimed,
  busy,
  accent,
  onClaim,
}: {
  tier: number;
  reached: boolean;
  premium: boolean;
  freeClaimed: boolean;
  premiumClaimed: boolean;
  busy: string | null;
  accent: string;
  onClaim(premium: boolean): void;
}) {
  const free = seasonTierReward(tier, false);
  const paid = seasonTierReward(tier, true);
  const cell = (isPremium: boolean) => {
    const claimed = isPremium ? premiumClaimed : freeClaimed;
    const reward = isPremium ? paid : free;
    const locked = isPremium && !premium;
    const ready = reached && !claimed && !locked;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tier ${tier} ${isPremium ? 'premium' : 'free'} reward`}
        disabled={!ready || busy !== null}
        onPress={() => onClaim(isPremium)}
        style={[
          s.tierCell,
          isPremium && { backgroundColor: '#2a2140' },
          ready && { borderColor: accent, boxShadow: `0 0 10px ${accent}66` },
          (claimed || (!reached && !ready)) && { opacity: claimed ? 0.5 : 0.75 },
        ]}
      >
        {reward.gems > 0 ? <GemIcon size={18} /> : <CoinIcon size={18} />}
        <Text style={{ color: ui.text, fontSize: 11, fontWeight: '800' }}>
          {reward.gems > 0 && !isPremium
            ? reward.gems
            : isPremium && reward.gems >= 40
              ? reward.gems
              : reward.coins}
        </Text>
        {claimed ? (
          <Ionicons name="checkmark" size={14} color={ui.green} />
        ) : locked ? (
          <Ionicons name="lock-closed" size={12} color={ui.subtle} />
        ) : ready ? (
          <Text style={{ color: accent, fontSize: 9, fontWeight: '900' }}>CLAIM</Text>
        ) : null}
      </Pressable>
    );
  };
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Text style={{ color: reached ? ui.text : ui.subtle, fontWeight: '800', fontSize: 12 }}>
        {tier}
      </Text>
      {cell(false)}
      {cell(true)}
    </View>
  );
}

const s = StyleSheet.create({
  giftRow: { flexDirection: 'row', gap: 6 },
  giftDay: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: ui.navy,
    borderWidth: 1.5,
    borderColor: '#ffffff1a',
  },
  giftDayLabel: { color: ui.subtle, fontSize: 10, fontWeight: '800' },
  giftDayAmount: { color: ui.text, fontSize: 11, fontWeight: '800' },
  rescueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: ui.gold,
    borderBottomWidth: 3,
    borderBottomColor: '#b77739',
  },
  streakDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff1a',
  },
  vaultCard: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: `${ui.gold}88`,
    boxShadow: `0 0 24px ${ui.gold}22`,
  },
  vaultInner: { padding: 16, gap: 10, overflow: 'hidden' },
  vaultBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#b77739',
  },
  vaultAmount: { color: ui.text, fontWeight: '900', fontSize: 40 },
  wheelThumb: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#ffb95f1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#2a2140',
    borderWidth: 1,
    borderColor: '#c084fc44',
  },
  gemButton: {
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
  tierCell: {
    width: 64,
    height: 70,
    borderRadius: 14,
    backgroundColor: ui.navy,
    borderWidth: 1.5,
    borderColor: '#ffffff1a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  claim: {
    backgroundColor: ui.green,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: '#047857',
  },
  prize: { alignItems: 'center', gap: 8 },
  prizeText: { color: ui.text, fontSize: 30, fontWeight: '900' },
});
