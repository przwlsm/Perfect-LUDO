import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ACHIEVEMENT_TIERS, getAchievement } from '@/domain';
import { Text } from '../components/AppText';
import { Body, Button, Card, Label, useShared } from '../components/Kit';
import { useCollection } from '../hooks/useCollection';
import { useMotionEnabled } from '../hooks/useMotionEnabled';
import { useProfile } from '../state/ProfileProvider';
import { makeStyles, useUi } from '../theme/AppearanceProvider';
import { Medal } from './Medal';

/** The door to the member's own Collection Room, on the profile. */
export function CollectionCard() {
  const { theme } = useProfile();
  const { t } = useTranslation('collection');
  const room = useCollection();
  const s = useStyles();
  const shared = useShared();
  const fresh = room.data?.unseen.length ?? 0;
  const top =
    room.data?.achievements
      .filter((a) => a.tier > 0)
      .sort((a, b) => b.tier - a.tier)
      .slice(0, 3) ?? [];
  return (
    <Card>
      <View style={shared.between}>
        <Label color={theme.accentText}>{t('profileCard.label')}</Label>
        {fresh > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{t('profileCard.newBadge', { count: fresh })}</Text>
          </View>
        )}
      </View>
      <View style={shared.row}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={shared.sectionTitle}>{t('profileCard.title')}</Text>
          <Body>{t('profileCard.body')}</Body>
        </View>
        {top.length > 0 && (
          <View style={s.medals}>
            {top.map((a) => {
              const def = getAchievement(a.id);
              return def ? <Medal key={a.id} icon={def.icon} tier={a.tier} size={34} /> : null;
            })}
          </View>
        )}
      </View>
      <Button secondary compact onPress={() => router.push('/collection')}>
        {t('profileCard.open')}
      </Button>
    </Card>
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

const useStyles = makeStyles((ui) => ({
  badge: { backgroundColor: ui.gold, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#1f1500', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  medals: { flexDirection: 'row', gap: 2 },
}));
