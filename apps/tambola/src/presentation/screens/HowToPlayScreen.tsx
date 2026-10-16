import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ALL_PRIZES, type PrizeId } from '@/domain/entities/Prize';
import type { TicketGrid } from '@/domain/entities/Ticket';
import { prizeNumbers } from '@/application/claims';
import { generateTicket } from '@/application/tickets';
import { AppText, Button, Card, type IconName } from '../components/Kit';
import { Page } from '../components/Page';
import { useLooks } from '../state/hooks';
import { TicketView } from '../ticket/TicketView';
import { useTheme } from '../theme/ThemeProvider';

const SAMPLE = generateTicket(90210);
const EARLY = new Set(
  prizeNumbers(SAMPLE, 'early5')
    .numbers.filter((_, i) => i % 3 === 1)
    .slice(0, 5),
);

export function HowToPlayScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { look, dabber } = useLooks();
  const steps = ['one', 'two', 'three', 'four'] as const;
  return (
    <Page title={t('how.title')}>
      <AppText variant="body">{t('how.intro')}</AppText>

      <AppText variant="label">{t('how.ticketTitle')}</AppText>
      <View style={styles.noTouch}>
        <TicketView
          grid={SAMPLE}
          label={t('play.ticket', { id: 'H7KQ-3' })}
          look={look}
          dabber={dabber}
          daubed={EARLY}
        />
      </View>
      <AppText variant="body" color={theme.muted}>
        {t('how.ticketBody')}
      </AppText>

      <AppText variant="label">{t('how.prizesTitle')}</AppText>
      <Card style={styles.prizes}>
        {ALL_PRIZES.map((p) => (
          <View key={p} style={styles.prize}>
            <Diagram grid={SAMPLE} prize={p} />
            <View style={styles.flex}>
              <AppText variant="heading">{t(`prizes.${p}`)}</AppText>
              <AppText variant="caption">{t(`prizeHelp.${p}`)}</AppText>
            </View>
          </View>
        ))}
      </Card>

      <AppText variant="label">{t('how.partyTitle')}</AppText>
      <Card style={styles.steps}>
        {steps.map((s, i) => (
          <View key={s} style={styles.step}>
            <View style={[styles.stepNo, { backgroundColor: theme.accent }]}>
              <AppText variant="heading" color={theme.onAccent}>
                {i + 1}
              </AppText>
            </View>
            <AppText variant="body" style={styles.flex}>
              {t(`how.steps.${s}`)}
            </AppText>
          </View>
        ))}
      </Card>

      <Note icon="wifi-outline" title={t('how.offlineTitle')} body={t('how.offlineBody')} />
      <Note icon="close-circle-outline" title={t('how.bogusTitle')} body={t('how.bogusBody')} />
      <Note icon="people-outline" title={t('how.soloTitle')} body={t('how.soloBody')} />
      <Note icon="print-outline" title={t('how.printTitle')} body={t('how.printBody')} />

      <Button icon="megaphone" label={t('home.host')} onPress={() => router.push('/host')} />
    </Page>
  );
}

/** A tiny ticket map with the cells a prize needs lit. */
function Diagram({ grid, prize }: { grid: TicketGrid; prize: PrizeId }) {
  const theme = useTheme();
  const lit = new Set(prize === 'early5' ? [...EARLY] : prizeNumbers(grid, prize).numbers);
  return (
    <View style={[styles.diagram, { backgroundColor: theme.surfaceRaised }]} accessible={false}>
      {grid.map((row, r) => (
        <View key={r} style={styles.diagramRow}>
          {row.map((n, c) => (
            <View
              key={c}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    n === null ? 'transparent' : lit.has(n) ? theme.accent : theme.faint,
                  opacity: n === null ? 0 : lit.has(n) ? 1 : 0.45,
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function Note({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const theme = useTheme();
  return (
    <Card style={styles.note}>
      <Ionicons name={icon} size={24} color={theme.accentText} />
      <View style={styles.flex}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="body" color={theme.muted}>
          {body}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
  flex: { flex: 1 },
  prizes: { gap: 14 },
  prize: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  diagram: { padding: 6, borderRadius: 10, gap: 3 },
  diagramRow: { flexDirection: 'row', gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  steps: { gap: 14 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
});
