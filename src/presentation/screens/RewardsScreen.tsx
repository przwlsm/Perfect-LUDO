import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  EXTRA_SPIN_GEMS,
  SEASON_PREMIUM_GEMS,
  SEASON_TIER_XP,
  SEASON_TIERS,
  SPIN_SLOTS,
  SPINS_PER_DAY,
  seasonTierReward,
  type Mission,
  type SpinResult,
} from '@/domain';
import { Text } from '../components/AppText';
import { Body, Button, Card, Label, Screen, shared, Sheet } from '../components/Kit';
import { CoinIcon, GemIcon } from '../components/Currency';
import { LuckyWheel } from '../components/LuckyWheel';
import { ProgressBar, RewardChips, timeLeft } from '../components/Progress';
import { useRewards } from '../hooks/useRewards';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';

export default function RewardsScreen() {
  const { theme, profile, member } = useProfile();
  const rewards = useRewards();
  const motionEnabled = useMotionEnabled(profile.reducedMotion, true);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [landing, setLanding] = useState<SpinResult | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [revealed, setRevealed] = useState<SpinResult | null>(null);

  if (!member)
    return (
      <Screen title="Rewards" subtitle="SPIN · MISSIONS · SEASON PASS">
        <Card>
          <Text style={shared.sectionTitle}>Rewards are kept on your account</Text>
          <Body>
            Sign in to spin the lucky wheel every day, finish daily missions, climb the season pass
            and earn gems.
          </Body>
          <Button onPress={() => router.push({ pathname: '/login', params: { intent: 'store' } })}>
            Sign in to start earning
          </Button>
        </Card>
      </Screen>
    );

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

  return (
    <Screen title="Rewards" subtitle="SPIN · MISSIONS · SEASON PASS">
      {rewards.error && <Text style={shared.error}>{rewards.error}</Text>}

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
        {rewards.error && <Text style={shared.error}>{rewards.error}</Text>}
      </Sheet>
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
  streakDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff1a',
  },
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
