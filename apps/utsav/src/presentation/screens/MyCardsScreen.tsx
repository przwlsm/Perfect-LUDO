import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { newCard } from '@/application/card';
import { heroTemplate } from '@/application/catalogue/templates';
import { CardThumb } from '../cards/CardThumb';
import { AppText, Button, IconButton, Pressy, Sheet } from '../components/Kit';
import { Page } from '../components/Page';
import { useCards } from '../state/CardsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

/** Every card made or sent on this phone, ready to open and send again. */
export function MyCardsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { cards, remove } = useCards();
  const { cardLanguage, settings } = useSettings();
  const [doomed, setDoomed] = useState<string | null>(null);
  const cell = Math.floor((Math.min(width, 640) - 32 - 14) / 2);

  return (
    <Page title={t('cards.title')}>
      {cards.length === 0 ? (
        <View style={styles.empty}>
          <CardThumb
            spec={newCard(heroTemplate('diwali'), cardLanguage, settings.name, 1)}
            width={Math.min(220, cell + 40)}
            radius={22}
          />
          <AppText variant="title" center>
            {t('cards.empty')}
          </AppText>
          <AppText variant="body" center color={theme.muted}>
            {t('cards.emptyBody')}
          </AppText>
          <Button icon="sparkles" label={t('cards.make')} onPress={() => router.replace('/')} />
        </View>
      ) : (
        <View style={styles.grid}>
          {cards.map((card) => {
            const thumbW = card.spec.format === 'story' ? Math.round(cell * 0.62) : cell;
            return (
              <View key={card.id} style={{ width: cell }}>
                <Pressy
                  onPress={() => router.push({ pathname: '/editor', params: { card: card.id } })}
                  onLongPress={() => setDoomed(card.id)}
                  accessibilityLabel={t('cards.open', {
                    name: t(`occasions.${card.spec.occasion}.name`),
                  })}
                  style={styles.thumb}
                >
                  <CardThumb spec={card.spec} width={thumbW} radius={18} />
                </Pressy>
                <View style={styles.meta}>
                  <View style={styles.flex}>
                    <AppText variant="heading" numberOfLines={1}>
                      {t(`occasions.${card.spec.occasion}.name`)}
                    </AppText>
                    {card.sent && (
                      <View style={styles.sent}>
                        <Ionicons name="paper-plane" size={12} color={theme.success} />
                        <AppText variant="caption" color={theme.success}>
                          {t('cards.sent')}
                        </AppText>
                      </View>
                    )}
                  </View>
                  <IconButton
                    icon="trash-outline"
                    label={t('cards.remove')}
                    size={40}
                    glass={false}
                    onPress={() => setDoomed(card.id)}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
      <Sheet
        visible={doomed !== null}
        onClose={() => setDoomed(null)}
        title={t('cards.removeTitle')}
      >
        <AppText variant="body" color={theme.muted}>
          {t('cards.removeBody')}
        </AppText>
        <Button
          icon="trash"
          label={t('common.delete')}
          onPress={() => {
            if (doomed) remove(doomed);
            setDoomed(null);
          }}
        />
        <Button kind="ghost" label={t('common.cancel')} onPress={() => setDoomed(null)} />
      </Sheet>
    </Page>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 14, paddingVertical: 24, paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  thumb: { alignItems: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  sent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
});
