import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CUPS, EXTRA_SPIN_GEMS, GEM_COIN_RATE, SEASON_PREMIUM_GEMS, TABLE_GIFTS } from '@/domain';
import { Text } from './AppText';
import { GemIcon } from './Currency';
import { Card, Label, useShared } from './Kit';
import { mirrorInRtl } from '../i18n/rtl';
import { makeStyles, useUi } from '../theme/AppearanceProvider';

type Use = {
  readonly key: 'cups' | 'spin' | 'season' | 'gifts' | 'store' | 'exchange';
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly href?: Href;
};

/** What gems buy, and where each one is; the earning line sits on top. */
const USES: readonly Use[] = [
  { key: 'cups', icon: 'trophy', href: '/cups' },
  { key: 'spin', icon: 'sync' },
  { key: 'season', icon: 'ribbon' },
  { key: 'gifts', icon: 'rose' },
  { key: 'store', icon: 'color-palette', href: '/store' },
  { key: 'exchange', icon: 'swap-horizontal' },
];

/**
 * Gems explained in one card: how to earn them and every way to use them,
 * with the live prices from the rules, so the numbers never drift from the game.
 */
export function GemGuide() {
  const { t } = useTranslation('rewards');
  const shared = useShared();
  const s = useStyles();
  const ui = useUi();
  const violet = ui.scheme === 'dark' ? '#c5a5ff' : ui.violet;
  const giftPrices = TABLE_GIFTS.map((g) => g.gems);
  const values = {
    cupGems: CUPS[CUPS.length - 1]!.gems,
    spin: EXTRA_SPIN_GEMS,
    season: SEASON_PREMIUM_GEMS,
    giftMin: Math.min(...giftPrices),
    giftMax: Math.max(...giftPrices),
    rate: GEM_COIN_RATE,
  };
  return (
    <Card style={{ gap: 10, borderColor: `${violet}55` }}>
      <View style={shared.row}>
        <GemIcon size={22} />
        <View style={{ flex: 1 }}>
          <Label color={violet}>{t('gemGuide.label')}</Label>
          <Text style={shared.sectionTitle}>{t('gemGuide.title')}</Text>
        </View>
      </View>
      <Text style={shared.small}>{t('gemGuide.earn', values)}</Text>
      {USES.map((use) => {
        const body = (
          <>
            <View style={[s.icon, { backgroundColor: `${violet}22` }]}>
              <Ionicons name={use.icon} size={18} color={violet} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.title}>{t(`gemGuide.${use.key}.title`)}</Text>
              <Text style={shared.small}>{t(`gemGuide.${use.key}.body`, values)}</Text>
            </View>
            {use.href && (
              <Ionicons name="chevron-forward" style={mirrorInRtl} size={18} color={ui.subtle} />
            )}
          </>
        );
        return use.href ? (
          <Pressable
            key={use.key}
            accessibilityRole="button"
            onPress={() => router.push(use.href!)}
            android_ripple={{ color: `${violet}30` }}
            style={s.row}
          >
            {body}
          </Pressable>
        ) : (
          <View key={use.key} style={s.row}>
            {body}
          </View>
        );
      })}
    </Card>
  );
}

const useStyles = makeStyles((ui) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: ui.line,
  },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { color: ui.text, fontSize: 14, fontWeight: '800' },
}));
