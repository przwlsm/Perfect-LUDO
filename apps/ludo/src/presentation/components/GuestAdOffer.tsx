import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AdTile } from './AdTile';
import { Text } from './AppText';
import { useShared } from './Kit';
import { useGuestAdReward } from '../hooks/useGuestAdReward';
import { useUi } from '../theme/AppearanceProvider';

/**
 * Home's "Free coins" offer for guests: the same opt-in rewarded ad as the
 * Rewards vault, put where a new player looks first. Hidden where ads are not
 * available; always a choice, never played uninvited.
 */
export function GuestAdOffer() {
  const { t } = useTranslation(['home', 'rewards']);
  const ad = useGuestAdReward();
  const ui = useUi();
  const shared = useShared();
  if (!ad.available) return null;

  const caption = ad.full
    ? t('rewards:guest.adFull')
    : ad.left > 0
      ? t('guestAd.caption')
      : t('rewards:gemAd.done');

  return (
    <View style={{ gap: 8 }}>
      <AdTile
        title={t('guestAd.title')}
        reward={t('guestAd.reward', { coins: ad.coinsPerAd })}
        icon="coin"
        caption={caption}
        busy={ad.busy}
        disabled={!ad.canWatch && !ad.busy}
        left={ad.left}
        total={ad.total}
        onPress={() => void ad.watch()}
      />
      {ad.noticeText && (
        <Text
          accessibilityLiveRegion="polite"
          style={[shared.small, { color: ad.succeeded ? ui.green : ui.danger }]}
        >
          {ad.noticeText}
        </Text>
      )}
    </View>
  );
}
