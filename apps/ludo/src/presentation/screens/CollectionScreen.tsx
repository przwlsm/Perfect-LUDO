import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  ACHIEVEMENT_GROUPS,
  ACHIEVEMENT_TIERS,
  ACHIEVEMENTS,
  CUPS,
  getAchievement,
  getCup,
  nextThreshold,
  tierProgress,
  type AchievementGroup,
  type CollectionView,
} from '@/domain';
import { Text } from '../components/AppText';
import { Body, Button, Card, Label, Screen, Sheet, useShared } from '../components/Kit';
import { LudoLoader } from '../components/LudoLoader';
import { ProgressBar } from '../components/Progress';
import { Medal, TIER_COLORS } from '../collection/Medal';
import { ThroneArt } from '../collection/ThroneArt';
import { UserAvatar } from '../social/UserAvatar';
import { useCollection } from '../hooks/useCollection';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useProfile } from '../state/ProfileProvider';
import { useSocial } from '../state/SocialProvider';
import { makeStyles, SchemeScope, useUi } from '../theme/AppearanceProvider';
import { readableOn } from '../theme/color';
import { liftByDay, NAVY_HERO } from '../theme/surfaces';
import { formatDate, numberLocale } from '../i18n/format';

type Tier = (typeof ACHIEVEMENT_TIERS)[number] | 'locked';
const tierName = (tier: number): Tier => (tier === 0 ? 'locked' : ACHIEVEMENT_TIERS[tier - 1]!);

/**
 * The Collection Room: a player's thrones from the cups, their medals with
 * four tiers each, and the three trophies they show on their card. The
 * signed-in member's own room (no id) can be arranged; another player's
 * is a visit, and a closed room shows only its name card.
 */
export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { member, theme, profile } = useProfile();
  const { identity } = useSocial();
  const { t } = useTranslation(['collection', 'common']);
  const own = !id || id === identity?.id;
  const room = useCollection(own ? undefined : id);
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const motion = useMotionEnabled(profile.reducedMotion, true);
  const [detail, setDetail] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const night = ui.scheme === 'dark';

  if (!member)
    return (
      <Screen back title={t('title')} subtitle={t('subtitle')}>
        <Card>
          <Text style={shared.sectionTitle}>{t('signIn.title')}</Text>
          <Body>{t('signIn.body')}</Body>
          <Button onPress={() => router.push('/login')}>{t('signIn.button')}</Button>
        </Card>
      </Screen>
    );

  const data = room.data;
  const name = data?.displayName || data?.username || t('common:defaultPlayerName');
  const title = own ? t('title') : t('visiting', { name });
  if (!data)
    return (
      <Screen back title={title} subtitle={t('subtitle')}>
        {room.error ? (
          <Card>
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {room.error}
            </Text>
            <Button secondary compact onPress={() => void room.reload()}>
              {t('common:actions.retry')}
            </Button>
          </Card>
        ) : (
          <LudoLoader motionEnabled={motion} label={t('loading')} />
        )}
      </Screen>
    );

  const unlocked = data.achievements.filter((a) => a.tier > 0).length;
  const tierOf = (achId: string) => data.achievements.find((a) => a.id === achId)?.tier ?? 0;
  const progressOf = (achId: string) =>
    data.achievements.find((a) => a.id === achId)?.progress ?? 0;
  const wonCount = (cupId: string) => data.thrones.find((x) => x.cup === cupId)?.count ?? 0;
  const detailDef = detail ? getAchievement(detail) : null;
  const detailTier = detail ? tierOf(detail) : 0;
  const detailProgress = detail ? progressOf(detail) : 0;
  const detailRow = detail ? data.achievements.find((a) => a.id === detail) : undefined;
  const isNew = (achId: string) => data.unseen.some((u) => u.id === achId);
  const accentText = night ? theme.accentText : readableOn(theme.accent, NAVY_HERO);

  return (
    <Screen back title={title} subtitle={t('subtitle')}>
      {/* ---- The name card ---- */}
      <View style={[s.hero, { borderColor: `${theme.accent}55` }]}>
        <LinearGradient
          colors={
            night ? [`${theme.accent}26`, `${theme.accent}0d`, `${theme.accent}00`] : NAVY_HERO
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroInner}
        >
          <SchemeScope scheme="dark">
            <View style={shared.row}>
              <UserAvatar id={data.userId} name={name} emoji={data.avatar} size={56} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.heroName} numberOfLines={1}>
                  {name}
                </Text>
                {data.stats && (
                  <Label color={accentText}>
                    {t('stats.level')} {data.stats.level}
                  </Label>
                )}
              </View>
            </View>
            {data.stats ? (
              <View style={s.statRow}>
                <HeroStat icon="ribbon" value={data.stats.cupsWon} label={t('stats.cups')} />
                <HeroStat icon="sparkles" value={data.stats.thrones} label={t('stats.thrones')} />
                <HeroStat icon="medal" value={unlocked} label={t('stats.medals')} />
              </View>
            ) : (
              <View style={{ gap: 4 }}>
                <Text style={s.heroClosed}>{t('closed.title')}</Text>
                <Text style={s.heroClosedBody}>{t('closed.body', { name })}</Text>
              </View>
            )}
          </SchemeScope>
        </LinearGradient>
      </View>

      {!data.isPublic && !own ? null : (
        <>
          {/* ---- New trophies (own room) ---- */}
          {own && data.unseen.length > 0 && (
            <Card style={{ borderColor: `${ui.gold}66` }}>
              <Label color={ui.gold}>{t('new.label')}</Label>
              {data.unseen.slice(0, 3).map((u) => {
                const def = getAchievement(u.id);
                if (!def) return null;
                return (
                  <View key={`${u.id}:${u.tier}`} style={shared.row}>
                    <Medal icon={def.icon} tier={u.tier} size={40} />
                    <Text style={[shared.sectionTitle, { fontSize: 16, flex: 1 }]}>
                      {t('new.one', {
                        name: t(`achievements.${def.id}.name`),
                        tier: t(`tiers.${tierName(u.tier)}`),
                      })}
                    </Text>
                  </View>
                );
              })}
              {data.unseen.length > 3 && (
                <Text style={shared.small}>{t('new.more', { count: data.unseen.length - 3 })}</Text>
              )}
              <Button secondary compact disabled={room.busy} onPress={() => void room.markSeen()}>
                {t('new.gotIt')}
              </Button>
            </Card>
          )}

          {/* ---- The showcase ---- */}
          <Card>
            <View style={shared.between}>
              <Label color={theme.accentText}>{t('showcase.label')}</Label>
              {own && (
                <Button secondary compact onPress={() => setEditing(true)}>
                  {t('showcase.edit')}
                </Button>
              )}
            </View>
            {data.showcase.length === 0 ? (
              <Body>{own ? t('showcase.empty') : t('showcase.emptyVisitor')}</Body>
            ) : (
              <View style={s.showcaseRow}>
                {data.showcase.map((item) => (
                  <ShowcaseItem
                    key={item}
                    item={item}
                    tier={tierOf(item.slice(4))}
                    motion={motion}
                    onPress={item.startsWith('ach:') ? () => setDetail(item.slice(4)) : undefined}
                  />
                ))}
              </View>
            )}
          </Card>

          {/* ---- The throne hall ---- */}
          <Card>
            <Label color={theme.accentText}>{t('thrones.label')}</Label>
            <Text style={shared.sectionTitle}>{t('thrones.title')}</Text>
            <Body>{t('thrones.body')}</Body>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingVertical: 6 }}
            >
              {CUPS.map((cup) => {
                const count = wonCount(cup.id);
                return (
                  <View key={cup.id} style={s.throneTile}>
                    <ThroneArt cup={cup} won={count > 0} size={84} shine={motion && count > 0} />
                    <Text style={s.throneName} numberOfLines={1}>
                      {t(`throneNames.${cup.id}`)}
                    </Text>
                    <Text style={shared.small} numberOfLines={1}>
                      {t(`halls.${cup.id}`)}
                    </Text>
                    <Text style={[s.throneCount, count === 0 && { color: ui.subtle }]}>
                      {count > 0
                        ? t('thrones.won', { count })
                        : cup.entry === 0
                          ? t('thrones.free')
                          : t('thrones.entry', { coins: cup.entry.toLocaleString(numberLocale()) })}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </Card>

          {/* ---- The medals ---- */}
          <View style={shared.between}>
            <Label color={theme.accentText}>{t('medals.label')}</Label>
            <Text style={shared.small}>
              {t('medals.unlocked', { done: unlocked, total: ACHIEVEMENTS.length })}
            </Text>
          </View>
          {ACHIEVEMENT_GROUPS.map((group) => (
            <MedalShelf
              key={group}
              group={group}
              tierOf={tierOf}
              isNew={isNew}
              motion={motion}
              onOpen={setDetail}
            />
          ))}

          {/* ---- Privacy (own room) ---- */}
          {own && (
            <Card>
              <View style={shared.between}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[shared.sectionTitle, { fontSize: 16 }]}>{t('privacy.title')}</Text>
                  <Text style={shared.small}>{t('privacy.hint')}</Text>
                </View>
                <Switch
                  accessibilityLabel={t('privacy.title')}
                  value={data.isPublic}
                  disabled={room.busy}
                  onValueChange={(value) => void room.setPublic(value)}
                  trackColor={{ false: ui.track, true: theme.accent }}
                  thumbColor="#ffffff"
                />
              </View>
            </Card>
          )}
          {room.error && (
            <Text accessibilityLiveRegion="polite" style={shared.error}>
              {room.error}
            </Text>
          )}
        </>
      )}

      {/* ---- One medal, up close ---- */}
      <Sheet
        visible={detailDef !== null}
        onClose={() => setDetail(null)}
        title={detailDef ? t(`achievements.${detailDef.id}.name`) : ''}
      >
        {detailDef && (
          <>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Medal icon={detailDef.icon} tier={detailTier} size={120} shine={motion} />
              <Text style={[shared.sectionTitle, { color: TIER_COLORS[detailTier]!.base }]}>
                {t(`tiers.${tierName(detailTier)}`)}
              </Text>
              {detailRow?.unlockedAt && (
                <Text style={shared.small}>
                  {t('detail.unlockedOn', { date: formatDate(new Date(detailRow.unlockedAt)) })}
                </Text>
              )}
            </View>
            <View style={{ gap: 8 }}>
              <ProgressBar
                value={tierProgress(detailDef, detailTier, detailProgress)}
                height={10}
                tone="gold"
              />
              <View style={shared.between}>
                <Text style={shared.small}>
                  {nextThreshold(detailDef, detailTier) === null
                    ? t('detail.maxed')
                    : t('detail.next', {
                        tier: t(`tiers.${ACHIEVEMENT_TIERS[detailTier]!}`),
                        target: nextThreshold(detailDef, detailTier),
                      })}
                </Text>
                <Text style={shared.small}>
                  {t('detail.progress', {
                    progress: detailProgress,
                    target: nextThreshold(detailDef, detailTier) ?? detailDef.thresholds[3],
                  })}
                </Text>
              </View>
            </View>
            <Text style={[shared.sectionTitle, { fontSize: 16 }]}>{t('detail.tiersTitle')}</Text>
            {ACHIEVEMENT_TIERS.map((tier, i) => (
              <View key={tier} style={[shared.row, { opacity: detailTier > i ? 1 : 0.6 }]}>
                <View style={[s.tierDot, { backgroundColor: TIER_COLORS[i + 1]!.base }]}>
                  {detailTier > i && (
                    <Ionicons name="checkmark" size={12} color={TIER_COLORS[i + 1]!.ink} />
                  )}
                </View>
                <Text style={{ color: ui.text, fontWeight: '700', width: 80 }}>
                  {t(`tiers.${tier}`)}
                </Text>
                <Text style={[shared.small, { flex: 1 }]}>
                  {t(`achievements.${detailDef.id}.goal`, { n: detailDef.thresholds[i] })}
                </Text>
              </View>
            ))}
          </>
        )}
      </Sheet>

      {/* ---- Arranging the showcase (own room) ---- */}
      {own && (
        <ShowcaseEditor
          visible={editing}
          data={data}
          busy={room.busy}
          onClose={() => setEditing(false)}
          onSave={async (items) => {
            await room.setShowcase(items);
            setEditing(false);
          }}
        />
      )}
    </Screen>
  );
}

function HeroStat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  const s = useStyles();
  const ui = useUi();
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={16} color={ui.gold} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** One of the three trophies on the card: a medal or a throne. */
function ShowcaseItem({
  item,
  tier,
  motion,
  onPress,
}: {
  item: string;
  tier: number;
  motion: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation('collection');
  const s = useStyles();
  const ui = useUi();
  if (item.startsWith('throne:')) {
    const cup = getCup(item.slice(7));
    if (!cup) return null;
    return (
      <View style={s.showcaseTile}>
        <ThroneArt cup={cup} won size={64} shine={motion} />
        <Text style={s.showcaseName} numberOfLines={2}>
          {t(`throneNames.${cup.id}`)}
        </Text>
      </View>
    );
  }
  const def = getAchievement(item.slice(4));
  if (!def) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: ui.ripple }}
      style={s.showcaseTile}
    >
      <Medal icon={def.icon} tier={tier} size={60} shine={motion && tier >= 3} />
      <Text style={s.showcaseName} numberOfLines={2}>
        {t(`achievements.${def.id}.name`)}
      </Text>
    </Pressable>
  );
}

/** One shelf of medals, by group. */
function MedalShelf({
  group,
  tierOf,
  isNew,
  motion,
  onOpen,
}: {
  group: AchievementGroup;
  tierOf: (id: string) => number;
  isNew: (id: string) => boolean;
  motion: boolean;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation('collection');
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const defs = ACHIEVEMENTS.filter((a) => a.group === group);
  return (
    <Card>
      <Text style={[shared.sectionTitle, { fontSize: 16 }]}>{t(`medals.groups.${group}`)}</Text>
      <View style={s.grid}>
        {defs.map((def) => {
          const tier = tierOf(def.id);
          return (
            <Pressable
              key={def.id}
              accessibilityRole="button"
              accessibilityLabel={`${t(`achievements.${def.id}.name`)} · ${t(`tiers.${tierName(tier)}`)}`}
              onPress={() => onOpen(def.id)}
              android_ripple={{ color: ui.ripple }}
              style={s.medalTile}
            >
              <Medal icon={def.icon} tier={tier} size={58} shine={motion && tier >= 3} />
              <Text style={s.medalName} numberOfLines={2}>
                {t(`achievements.${def.id}.name`)}
              </Text>
              <Text
                style={[s.medalTier, { color: tier === 0 ? ui.subtle : TIER_COLORS[tier]!.base }]}
              >
                {t(`tiers.${tierName(tier)}`)}
              </Text>
              {isNew(def.id) && (
                <View style={[s.newTag, { backgroundColor: ui.gold }]}>
                  <Text style={s.newTagText}>NEW</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

/** Choosing up to three unlocked medals and won thrones for the card. */
function ShowcaseEditor({
  visible,
  data,
  busy,
  onClose,
  onSave,
}: {
  visible: boolean;
  data: CollectionView;
  busy: boolean;
  onClose(): void;
  onSave(items: string[]): Promise<void>;
}) {
  const { t } = useTranslation('collection');
  const { theme } = useProfile();
  const s = useStyles();
  const ui = useUi();
  const shared = useShared();
  const [picked, setPicked] = useState<string[]>([...data.showcase]);
  const [shownFor, setShownFor] = useState(visible);
  if (shownFor !== visible) {
    setShownFor(visible);
    setPicked([...data.showcase]);
  }
  type Option = { key: string; node: ReactNode; label: string };
  const options: Option[] = [
    ...data.thrones.flatMap((th): Option[] => {
      const cup = getCup(th.cup);
      return cup
        ? [
            {
              key: `throne:${cup.id}`,
              node: <ThroneArt cup={cup} won size={48} shine={false} />,
              label: t(`throneNames.${cup.id}`),
            },
          ]
        : [];
    }),
    ...data.achievements
      .filter((a) => a.tier > 0)
      .flatMap((a): Option[] => {
        const def = getAchievement(a.id);
        return def
          ? [
              {
                key: `ach:${def.id}`,
                node: <Medal icon={def.icon} tier={a.tier} size={44} />,
                label: t(`achievements.${def.id}.name`),
              },
            ]
          : [];
      }),
  ];
  const toggle = (key: string) =>
    setPicked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length >= 3 ? prev : [...prev, key],
    );
  return (
    <Sheet visible={visible} onClose={onClose} title={t('showcase.sheetTitle')}>
      <Body>{t('showcase.hint')}</Body>
      {options.length === 0 ? (
        <Body>{t('showcase.nothingYet')}</Body>
      ) : (
        <View style={s.grid}>
          {options.map((o) => {
            const on = picked.includes(o.key);
            return (
              <Pressable
                key={o.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={o.label}
                onPress={() => toggle(o.key)}
                android_ripple={{ color: ui.ripple }}
                style={[
                  s.medalTile,
                  on && { borderColor: theme.accent, backgroundColor: `${theme.accent}14` },
                ]}
              >
                {o.node}
                <Text style={s.medalName} numberOfLines={2}>
                  {o.label}
                </Text>
                {on && (
                  <View style={[s.newTag, { backgroundColor: theme.accent }]}>
                    <Ionicons name="checkmark" size={12} color="#ffffff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
      <Text style={shared.small}>{t('showcase.count', { n: picked.length })}</Text>
      <Button disabled={busy} onPress={() => void onSave(picked)}>
        {t('showcase.save')}
      </Button>
    </Sheet>
  );
}

const useStyles = makeStyles((ui) => ({
  hero: { borderRadius: 22, overflow: 'hidden', borderWidth: 1.5, boxShadow: liftByDay(ui) },
  heroInner: { padding: 16, gap: 14 },
  heroName: { fontSize: 22, fontWeight: '900', color: '#dee1f7' },
  heroClosed: { fontSize: 16, fontWeight: '800', color: '#dee1f7' },
  heroClosedBody: { fontSize: 13, lineHeight: 18, color: '#c2c6d6' },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#ffffff12',
  },
  statValue: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#c2c6d6', fontSize: 11 },
  showcaseRow: { flexDirection: 'row', gap: 10 },
  showcaseTile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.scheme === 'light' ? '#ffffff' : ui.fill,
  },
  showcaseName: { color: ui.text, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  throneTile: { width: 118, alignItems: 'center', gap: 2 },
  throneName: { color: ui.text, fontSize: 13, fontWeight: '800', marginTop: 4 },
  throneCount: { color: ui.gold, fontSize: 11, fontWeight: '800', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  medalTile: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.scheme === 'light' ? '#ffffff' : ui.fill,
    boxShadow: liftByDay(ui),
  },
  medalName: {
    color: ui.text,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    minHeight: 30,
  },
  medalTier: { fontSize: 11, fontWeight: '800' },
  newTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newTagText: { color: '#1f1500', fontSize: 9, fontWeight: '900' },
  tierDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
