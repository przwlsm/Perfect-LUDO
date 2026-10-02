import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  AD_RESCUE_BOOST_COINS,
  AD_REWARD_CAPS,
  EXTRA_SPIN_GEMS,
  GIFT_CYCLE_COINS,
  GIFT_STREAK_GEMS,
  giftCalendar,
  GUEST_VAULT_AD_COINS,
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
import { Body, Button, Card, Label, Screen, Sheet, useShared } from '../components/Kit';
import { CoinIcon, GemIcon } from '../components/Currency';
import { AdTile } from '../components/AdTile';
import { LuckyWheel } from '../components/LuckyWheel';
import { Shine } from '../components/Live';
import { ProgressBar, RewardChips, timeLeft } from '../components/Progress';
import { useRewards } from '../hooks/useRewards';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useGuestAdReward } from '../hooks/useGuestAdReward';
import { useProfile } from '../state/ProfileProvider';
import { i18n } from '../i18n';
import { makeStyles, SchemeScope, useUi } from '../theme/AppearanceProvider';
import { DARK } from '../theme/palette';
import { liftByDay, MARIGOLD, NAVY_HERO, pillColors } from '../theme/surfaces';
import { numberLocale } from '../i18n/format';

/**
 * A message under a card: a catalogue key, so it follows a language change,
 * or the server's own text as it came.
 */
type Notice = { key: 'claimFailed' | 'adNotFinished' | 'addFailed' | 'adAdded' } | { text: string };

/** Called while rendering, so it reads the current language. */
function noticeText(notice: Notice): string {
  if ('text' in notice) return notice.text;
  if (notice.key === 'adAdded')
    return i18n.t('rewards:guest.adAdded', { coins: GUEST_VAULT_AD_COINS });
  return i18n.t(`rewards:errors.${notice.key}`);
}

const num = (n: number) => n.toLocaleString(numberLocale());

/**
 * Fixed fills of the gold and green claim buttons and the vault badge: bright
 * in both modes, with their dark labels ('#3b2400', '#003824') on top.
 */
const GOLD_BUTTON = DARK.gold;
const GREEN_BUTTON = DARK.green;

/** The guest vault's gold gradient: night as before, a soft gold paper by day. */
const VAULT_DARK = ['#3d2f0f', '#221a0a', '#1a1408'] as const;
const VAULT_LIGHT = ['#fff7e3', '#fdeecb', '#fae6b9'] as const;

/** The wheel's prize line, by prize kind. */
const PRIZE_KEYS = {
  coins: 'spin.prizeCoins',
  gems: 'spin.prizeGems',
  xp: 'spin.prizeXp',
} as const satisfies Record<SpinResult['reward']['kind'], string>;

export default function RewardsScreen() {
  const { theme, profile, member, claimGift, claimRescue, claimVault } = useProfile();
  const { t } = useTranslation('rewards');
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const night = ui.scheme === 'dark';
  const rewards = useRewards();
  const [busy, setBusy] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<Notice | null>(null);
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
      setClaimError(e instanceof Error ? { text: e.message } : { key: 'claimFailed' });
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
        setClaimError({ key: 'adNotFinished' });
        return false;
      }
      return (await rewards.claimAdReward(kind)) !== null;
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen title={t('title')} subtitle={t('subtitle')}>
      {rewards.error && <Text style={shared.error}>{rewards.error}</Text>}

      {/* ---- Guest vault carried onto this account ---- */}
      {profile.vaultCoins > 0 && (
        <Card style={s.vaultCarry}>
          <View style={shared.between}>
            <View style={{ flex: 1, gap: 4 }}>
              <Label color={ui.gold}>{t('vaultCarry.label')}</Label>
              <Text style={shared.sectionTitle}>
                {t('vaultCarry.title', { amount: num(profile.vaultCoins) })}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('vaultCarry.a11y', { amount: profile.vaultCoins })}
              disabled={busy !== null}
              onPress={() => void claim('vault')}
              style={[s.rescueButton, busy !== null && { opacity: 0.5 }]}
            >
              <CoinIcon size={18} />
              <Text style={{ color: '#3b2400', fontWeight: '900' }}>
                {busy === 'vault' ? '…' : t('vaultCarry.claim')}
              </Text>
            </Pressable>
          </View>
        </Card>
      )}

      {/* ---- Daily reward calendar: by day the screen's one marigold card ---- */}
      <GiftShell night={night}>
        <View style={{ gap: 4 }}>
          <Label color={night ? ui.green : ui.text}>{t('gift.label')}</Label>
          <Text style={shared.sectionTitle}>
            {gift.claimedToday
              ? t('gift.collectedTitle', { day: gift.day })
              : t('gift.readyTitle', { day: gift.day })}
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
                  // White tiles on the marigold card by day.
                  !night && { backgroundColor: theme.surface },
                  collected && { opacity: 0.45 },
                  active && { borderColor: ui.green, boxShadow: `0 0 10px ${ui.green}55` },
                ]}
              >
                <Text style={s.giftDayLabel} numberOfLines={1} adjustsFontSizeToFit>
                  {t('gift.dayShort', { day })}
                </Text>
                {day === 7 ? <GemIcon size={14} /> : <CoinIcon size={14} />}
                <Text style={s.giftDayAmount}>{day === 7 ? `+${GIFT_STREAK_GEMS}` : coins}</Text>
                {collected && <Ionicons name="checkmark" size={12} color={ui.green} />}
              </View>
            );
          })}
        </View>
        <Text style={shared.small}>
          {t('gift.hint', { coins: GIFT_CYCLE_COINS[6], gems: GIFT_STREAK_GEMS })}
        </Text>
        {/* By day a navy button: the theme's gold accent would melt into marigold. */}
        <Button
          secondary={!night}
          disabled={gift.claimedToday || busy !== null}
          onPress={() => void claim('gift')}
        >
          {busy === 'gift'
            ? t('gift.claiming')
            : gift.claimedToday
              ? t('gift.collected')
              : gift.day === 7
                ? t('gift.claimDayGems', {
                    day: gift.day,
                    coins: GIFT_CYCLE_COINS[gift.day - 1],
                    gems: GIFT_STREAK_GEMS,
                  })
                : t('gift.claimDay', { day: gift.day, coins: GIFT_CYCLE_COINS[gift.day - 1] })}
        </Button>
      </GiftShell>

      {/* ---- Comeback rescue: only while nearly broke ---- */}
      {profile.coins < RESCUE_THRESHOLD &&
        (() => {
          const boost = rescueUsed && adsOk && adsLeft('rescue-boost') > 0;
          const spent = rescueUsed && !boost;
          return (
            <Card style={{ borderColor: `${ui.gold}55` }}>
              <View style={shared.between}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Label color={ui.gold}>{t('rescue.label')}</Label>
                  <Text style={shared.sectionTitle}>{t('rescue.title')}</Text>
                  <Text style={shared.small}>
                    {boost
                      ? t('rescue.boostHint', { amount: AD_RESCUE_BOOST_COINS })
                      : spent
                        ? t('rescue.spentHint')
                        : t('rescue.claimHint', { amount: RESCUE_COINS })}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    boost
                      ? t('rescue.boostA11y', { amount: AD_RESCUE_BOOST_COINS })
                      : t('rescue.claimA11y', { amount: RESCUE_COINS })
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
      {claimError && <Text style={shared.error}>{noticeText(claimError)}</Text>}

      {/* ---- Daily lucky spin: by day the screen's navy hero (the 30%) ---- */}
      <SchemeScope scheme="dark">
        <SpinHero
          day={!night}
          streakLit={profile.spinStreak % 7 || (profile.spinStreak && !freeSpin ? 7 : 0)}
          cta={
            freeSpin
              ? t('spin.freeReady')
              : spinsToday < SPINS_PER_DAY
                ? t('spin.extra', { gems: EXTRA_SPIN_GEMS })
                : t('spin.backTomorrow')
          }
          onOpen={() => setWheelOpen(true)}
        />
      </SchemeScope>

      {/* ---- Free gems for a rewarded ad ---- */}
      {adsOk && (
        <AdTile
          title={t('gemAd.title')}
          reward={t('gemAd.reward')}
          icon="gem"
          caption={adsLeft('gem') > 0 ? t('gemAd.caption') : t('gemAd.done')}
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
          <Text style={shared.sectionTitle}>{t('missions.title')}</Text>
          {data && (
            <Text style={shared.small}>
              {t('missions.newIn', { time: timeLeft(data.missionsResetAt) })}
            </Text>
          )}
        </View>
        {(data?.missions ?? []).map((mission) => (
          <MissionRow
            key={mission.id}
            mission={mission}
            busy={rewards.busy === `mission:${mission.id}`}
            onClaim={() => void rewards.claimMission(mission.id)}
          />
        ))}
        {!data && !rewards.error && <Text style={shared.small}>{t('missions.loading')}</Text>}
      </View>

      {/* ---- Season pass ---- */}
      {season && (
        <Card style={{ borderColor: `${ui.blue}40` }}>
          <View style={shared.between}>
            <View style={{ gap: 4 }}>
              <Label color={ui.blueSoft}>{t('season.label', { number: season.number })}</Label>
              <Text style={shared.sectionTitle}>
                {t('season.tier', { tier: tierReached, total: SEASON_TIERS })}
              </Text>
            </View>
            <Text style={shared.small}>
              {t('season.endsIn', { time: timeLeft(season.endsAt) })}
            </Text>
          </View>
          <ProgressBar value={tierReached >= SEASON_TIERS ? 1 : intoTier / SEASON_TIER_XP} />
          <Text style={shared.small}>
            {tierReached >= SEASON_TIERS
              ? t('season.complete')
              : t('season.progress', {
                  xp: intoTier,
                  needed: SEASON_TIER_XP,
                  next: tierReached + 1,
                })}
          </Text>
          {!season.premium && (
            <View style={s.premiumBox}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[shared.sectionTitle, { fontSize: 16 }]}>
                  {t('season.premiumTitle')}
                </Text>
                <Text style={shared.small}>{t('season.premiumHint')}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('season.premiumA11y', { gems: SEASON_PREMIUM_GEMS })}
                disabled={rewards.busy !== null || profile.gems < SEASON_PREMIUM_GEMS}
                onPress={() => void rewards.buyPremium()}
                style={[s.gemButton, profile.gems < SEASON_PREMIUM_GEMS && { opacity: 0.5 }]}
              >
                <GemIcon size={18} />
                <Text style={s.gemButtonText}>{SEASON_PREMIUM_GEMS}</Text>
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
                accentText={theme.accentText}
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
        title={t('spin.sheetTitle')}
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
            <Label color={ui.gold}>{t('spin.youWon')}</Label>
            <View style={[shared.row, { justifyContent: 'center' }]}>
              {revealed.reward.kind === 'coins' ? (
                <CoinIcon size={30} />
              ) : revealed.reward.kind === 'gems' ? (
                <GemIcon size={30} />
              ) : null}
              <Text style={s.prizeText}>
                {t(PRIZE_KEYS[revealed.reward.kind], { amount: num(revealed.reward.amount) })}
              </Text>
            </View>
            {revealed.reward.streakBonus > 0 && (
              <Text style={{ color: ui.gem, fontWeight: '800', textAlign: 'center' }}>
                {t('spin.streakBonus', { gems: revealed.reward.streakBonus })}
              </Text>
            )}
          </View>
        ) : (
          <Text style={[shared.small, { textAlign: 'center' }]}>
            {t('spin.about', {
              slots: SPIN_SLOTS.length,
              extra: SPINS_PER_DAY - 1,
              gems: EXTRA_SPIN_GEMS,
            })}
          </Text>
        )}
        <Button
          disabled={!canSpin || rewards.busy !== null || spinning}
          onPress={() => void spin()}
        >
          {rewards.busy === 'spin' || spinning
            ? t('spin.spinning')
            : freeSpin
              ? t('spin.spinFree')
              : spinsToday < SPINS_PER_DAY
                ? t('spin.spinAgain', { gems: EXTRA_SPIN_GEMS })
                : t('spin.noneLeft')}
        </Button>
        {adsOk && !freeSpin && spinsToday < SPINS_PER_DAY && adsLeft('spin') > 0 && (
          <AdTile
            compact
            title={t('spin.adTitle')}
            reward={t('spin.adReward')}
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
 * The daily-gift card's shell: by night the card as before; by day the
 * screen's one marigold highlight (the 10% of 60-30-10), with navy text.
 */
function GiftShell({ night, children }: { night: boolean; children: ReactNode }) {
  const s = useStyles();
  const ui = useUi();
  if (night) return <Card style={{ borderColor: `${ui.green}40` }}>{children}</Card>;
  return (
    <LinearGradient
      colors={MARIGOLD}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.marigold}
    >
      {children}
    </LinearGradient>
  );
}

/**
 * The lucky-spin card. Always drawn in the night palette (see SchemeScope at
 * its call site): by night it is the card as before, by day the screen's navy
 * hero, so its text, dots and button take the night tokens.
 */
function SpinHero({
  day,
  streakLit,
  cta,
  onOpen,
}: {
  day: boolean;
  /** How many of the seven streak dots are lit. */
  streakLit: number;
  cta: string;
  onOpen(): void;
}) {
  const { t } = useTranslation('rewards');
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const body = (
    <>
      <View style={shared.between}>
        <View style={{ flex: 1, gap: 6 }}>
          <Label color={ui.gold}>{t('spin.label')}</Label>
          <Text style={shared.sectionTitle}>{t('spin.title')}</Text>
          <View style={[shared.row, { gap: 6 }]}>
            {Array.from({ length: 7 }, (_, i) => (
              <View key={i} style={[s.streakDot, i < streakLit && { backgroundColor: ui.gold }]} />
            ))}
            <Text style={shared.small}>{t('spin.streakHint')}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('spin.openA11y')}
          onPress={onOpen}
          style={s.wheelThumb}
        >
          <Ionicons name="sync-circle" size={46} color={ui.gold} />
        </Pressable>
      </View>
      <Button onPress={onOpen}>{cta}</Button>
    </>
  );
  if (!day) return <Card style={{ borderColor: `${ui.gold}40` }}>{body}</Card>;
  return (
    <LinearGradient
      colors={NAVY_HERO}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.spinHero}
    >
      {body}
    </LinearGradient>
  );
}

/**
 * The guest Rewards screen: everything earned goes into a locked vault that
 * signing in pays out. Playing fills it; up to three opt-in ads a day top
 * it up faster. Nothing here ever plays an ad uninvited.
 */
function GuestRewards() {
  const { profile } = useProfile();
  const { t } = useTranslation('rewards');
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const motion = useMotionEnabled(profile.reducedMotion, true);
  const ad = useGuestAdReward();
  const full = ad.full;

  return (
    <Screen title={t('title')} subtitle={t('guest.subtitle')}>
      <View style={s.vaultCard}>
        <LinearGradient
          colors={ui.scheme === 'dark' ? VAULT_DARK : VAULT_LIGHT}
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
                <Label color={ui.gold}>{t('guest.vaultLabel')}</Label>
                <Text style={{ color: ui.muted, fontSize: 11, fontWeight: '700' }}>
                  {t('guest.vaultHint')}
                </Text>
              </View>
            </View>
            <Text style={{ color: ui.subtle, fontSize: 10, fontWeight: '800' }}>
              {t('guest.max', { amount: num(GUEST_VAULT_CAP) })}
            </Text>
          </View>
          <View style={[shared.row, { justifyContent: 'center', gap: 10, paddingVertical: 6 }]}>
            <CoinIcon size={34} />
            <Text style={s.vaultAmount}>{num(profile.vaultCoins)}</Text>
          </View>
          <ProgressBar
            value={Math.min(1, profile.vaultCoins / GUEST_VAULT_CAP)}
            colors={[ui.gold, '#f59e0b']}
            height={10}
          />
          <Text style={[shared.small, { textAlign: 'center' }]}>
            {full ? t('guest.full') : t('guest.winHint', { coins: GUEST_VAULT_WIN })}
          </Text>
          <Button onPress={() => router.push({ pathname: '/login', params: { intent: 'store' } })}>
            {profile.vaultCoins > 0
              ? t('guest.signInClaim', { amount: num(profile.vaultCoins) })
              : t('guest.signInStart')}
          </Button>
        </LinearGradient>
      </View>

      {ad.available && (
        <AdTile
          title={t('guest.adTitle')}
          reward={t('guest.adReward', { coins: ad.coinsPerAd })}
          icon="coin"
          caption={full ? t('guest.adFull') : ad.left > 0 ? t('gemAd.caption') : t('gemAd.done')}
          busy={ad.busy}
          disabled={!ad.canWatch && !ad.busy}
          left={ad.left}
          total={ad.total}
          onPress={() => void ad.watch()}
        />
      )}
      {ad.noticeText && (
        <Text
          accessibilityLiveRegion="polite"
          style={[shared.small, { color: ad.succeeded ? ui.green : ui.danger }]}
        >
          {ad.noticeText}
        </Text>
      )}

      <Card>
        <Text style={shared.sectionTitle}>{t('guest.accountTitle')}</Text>
        <Body>{t('guest.accountBody')}</Body>
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
  const { t } = useTranslation('rewards');
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
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
            <Text style={{ color: ui.green, fontWeight: '800', fontSize: 12 }}>
              {t('missions.claimed')}
            </Text>
          </View>
        ) : done ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('missions.claimA11y', { title: mission.title })}
            disabled={busy}
            onPress={onClaim}
            style={s.claim}
          >
            <Text style={{ color: '#003824', fontWeight: '900', fontSize: 13 }}>
              {busy ? '…' : t('missions.claim')}
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
          colors={[DARK.green, '#10b981']}
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
  accentText,
  onClaim,
}: {
  tier: number;
  reached: boolean;
  premium: boolean;
  freeClaimed: boolean;
  premiumClaimed: boolean;
  busy: string | null;
  accent: string;
  /** The accent as text, readable on the page. */
  accentText: string;
  onClaim(premium: boolean): void;
}) {
  const { t } = useTranslation('rewards');
  const s = useStyles();
  const ui = useUi();
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
        accessibilityLabel={
          isPremium ? t('season.tierPremiumA11y', { tier }) : t('season.tierFreeA11y', { tier })
        }
        disabled={!ready || busy !== null}
        onPress={() => onClaim(isPremium)}
        style={[
          s.tierCell,
          isPremium && s.premiumCell,
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
          <Text style={{ color: accentText, fontSize: 9, fontWeight: '900' }}>
            {t('season.claim')}
          </Text>
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

const useStyles = makeStyles((ui) => ({
  // Night: the gold-tinted card as before. Day: a white card with a gold rim.
  vaultCarry:
    ui.scheme === 'dark'
      ? { borderColor: ui.gold, backgroundColor: '#2a2210' }
      : { borderColor: `${ui.gold}55` },
  // Day only: the marigold gift card, laid out like a Card.
  marigold: {
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: `${ui.gold}55`,
    boxShadow: liftByDay(ui),
    overflow: 'hidden',
  },
  // Day only, built from the night tokens inside SchemeScope: the navy spin hero.
  spinHero: {
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: `${ui.gold}40`,
    overflow: 'hidden',
  },
  giftRow: { flexDirection: 'row', gap: 6 },
  giftDay: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    borderRadius: 12,
    // A tile, not a button: navy slate by night, a light surface by day.
    backgroundColor: ui.scheme === 'dark' ? ui.navy : ui.surfaceLow,
    borderWidth: 1.5,
    borderColor: ui.line,
  },
  giftDayLabel: { color: ui.subtle, fontSize: 10, fontWeight: '800' },
  giftDayAmount: { color: ui.text, fontSize: 11, fontWeight: '800' },
  rescueButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: GOLD_BUTTON,
    borderBottomWidth: 3,
    borderBottomColor: '#b77739',
  },
  streakDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ui.fillStrong,
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
    backgroundColor: GOLD_BUTTON,
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
    backgroundColor: `${ui.gold}1a`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    // Day: a faint ink well on the white card instead of a violet wash.
    backgroundColor: ui.scheme === 'dark' ? '#2a2140' : ui.fill,
    borderWidth: 1,
    borderColor: `${ui.gem}44`,
  },
  premiumCell: {
    backgroundColor: ui.scheme === 'dark' ? '#2a2140' : pillColors(DARK.gem, ui).background,
  },
  gemButton: {
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
  // On the purple button: the night text as before, white in day for contrast.
  gemButtonText: { color: ui.scheme === 'dark' ? ui.text : ui.onColor, fontWeight: '800' },
  tierCell: {
    width: 64,
    height: 70,
    borderRadius: 14,
    backgroundColor: ui.scheme === 'dark' ? ui.navy : ui.surfaceLow,
    borderWidth: 1.5,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  claim: {
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: GREEN_BUTTON,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: '#047857',
  },
  prize: { alignItems: 'center', gap: 8 },
  prizeText: { color: ui.text, fontSize: 30, fontWeight: '900' },
}));
