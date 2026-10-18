import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ACHIEVEMENT_TIERS, ACHIEVEMENTS, CUPS, getAchievement, getCup } from '@/domain';
import { Text } from '../components/AppText';
import { Button, Card, Label, useShared } from '../components/Kit';
import { Shine } from '../components/Live';
import { mirrorInRtl } from '../i18n/rtl';
import { ThroneArt } from './ThroneArt';
import { useCollection } from '../hooks/useCollection';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useProfile } from '../state/ProfileProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { Medal } from './Medal';

/**
 * The door to the member's own Collection Room, on the profile: a lit
 * throne room card with their best throne shining, how many thrones and
 * medals they hold, and their top medals. The whole card opens the room.
 */
export function CollectionCard() {
  const { profile } = useProfile();
  const { t } = useTranslation('collection');
  const room = useCollection();
  const s = useStyles();
  const motion = useMotionEnabled(profile.reducedMotion, true);
  const fresh = room.data?.unseen.length ?? 0;
  const wonCups = CUPS.filter(
    (c) => (room.data?.thrones.find((x) => x.cup === c.id)?.count ?? 0) > 0,
  );
  // The grandest throne they hold; before their first, the King's throne as the goal.
  const best = wonCups[wonCups.length - 1] ?? getCup('king')!;
  const medals = room.data?.achievements.filter((a) => a.tier > 0).length ?? 0;
  const top =
    room.data?.achievements
      .filter((a) => a.tier > 0)
      .sort((a, b) => b.tier - a.tier)
      .slice(0, 3) ?? [];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('profileCard.title')}. ${t('profileCard.summary', {
        thrones: wonCups.length,
        total: CUPS.length,
        medals,
        medalTotal: ACHIEVEMENTS.length,
      })}`}
      onPress={() => router.push('/collection')}
      android_ripple={{ color: '#ffd76a30' }}
      style={({ pressed }) => [s.card, { opacity: pressed ? 0.92 : 1 }]}
    >
      <LinearGradient
        colors={['#2a1150', '#170a33', '#0b0620']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Shine active={motion} every={3600} strength={0.16} />
      <View style={s.throne}>
        <ThroneArt cup={best} won size={64} shine={motion} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <View style={s.labelRow}>
          <Text style={s.label}>{t('profileCard.label')}</Text>
          {fresh > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{t('profileCard.newBadge', { count: fresh })}</Text>
            </View>
          )}
        </View>
        <Text style={s.title}>{t('profileCard.title')}</Text>
        <View style={s.chips}>
          <View style={s.chip}>
            <Ionicons name="sparkles" size={12} color="#ffd76a" />
            <Text style={s.chipText}>
              {t('profileCard.thrones', { n: wonCups.length, total: CUPS.length })}
            </Text>
          </View>
          <View style={s.chip}>
            <Ionicons name="medal" size={12} color="#ffd76a" />
            <Text style={s.chipText}>
              {t('profileCard.medals', { n: medals, total: ACHIEVEMENTS.length })}
            </Text>
          </View>
        </View>
        {top.length > 0 && (
          <View style={s.medals}>
            {top.map((a) => {
              const def = getAchievement(a.id);
              return def ? <Medal key={a.id} icon={def.icon} tier={a.tier} size={28} /> : null;
            })}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" style={mirrorInRtl} size={22} color="#ffd76a" />
    </Pressable>
  );
}

/**
 * The newest trophy, on the home screen until the member has seen it in
 * the room. Renders nothing when there is nothing new.
 */
export function NewTrophyCard() {
  const { profile } = useProfile();
  const { t } = useTranslation('collection');
  const room = useCollection();
  const ui = useUi();
  const shared = useShared();
  const motion = useMotionEnabled(profile.reducedMotion, true);
  const unseen = room.data?.unseen ?? [];
  const latest = unseen[unseen.length - 1];
  const def = latest ? getAchievement(latest.id) : null;
  if (!latest || !def) return null;
  return (
    <Card style={{ borderColor: `${ui.gold}66` }}>
      <View style={shared.row}>
        <Medal icon={def.icon} tier={latest.tier} size={52} shine={motion} />
        <View style={{ flex: 1, gap: 4 }}>
          <Label color={ui.gold}>{t('new.label')}</Label>
          <Text style={[shared.sectionTitle, { fontSize: 17 }]}>
            {t('new.one', {
              name: t(`achievements.${def.id}.name`),
              tier: t(`tiers.${ACHIEVEMENT_TIERS[latest.tier - 1] ?? 'bronze'}`),
            })}
          </Text>
          {unseen.length > 1 && (
            <Text style={shared.small}>{t('new.more', { count: unseen.length - 1 })}</Text>
          )}
        </View>
        <Button compact onPress={() => router.push('/collection')}>
          {t('new.open')}
        </Button>
      </View>
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  /** Always the night throne room, by day and by night, like a poster on the page. */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffd76a77',
    backgroundColor: '#170a33',
    boxShadow: '0 10px 24px rgba(58, 20, 120, 0.35)',
  },
  throne: { width: 76, alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: '#ffd76a', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ffffff1a',
    borderWidth: 1,
    borderColor: '#ffffff2e',
  },
  chipText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  badge: { backgroundColor: '#ffd76a', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#1f1500', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  medals: { flexDirection: 'row', gap: 2 },
}));
