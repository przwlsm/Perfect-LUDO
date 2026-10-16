import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from './AppText';
import { Body, Button, Sheet } from './Kit';
import { makeStyles, useUi } from '../theme/AppearanceProvider';

/** The one page that explains where the dice come from. */
export function FairDiceSheet({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const { t } = useTranslation('fair');
  const ui = useUi();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('title')}>
      <View style={{ alignItems: 'center' }}>
        <Ionicons name="shield-checkmark" size={44} color={ui.green} />
      </View>
      <Body>{t('p1')}</Body>
      <Body>{t('p2')}</Body>
      <Body>{t('p3')}</Body>
      <Body>{t('p4')}</Body>
      <Button onPress={onClose}>{t('close')}</Button>
    </Sheet>
  );
}

/** The small pill on an online table: tapping it opens the explanation. */
export function FairDiceBadge() {
  const { t } = useTranslation('fair');
  const [open, setOpen] = useState(false);
  const s = useStyles();
  const ui = useUi();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('badgeA11y')}
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={s.pill}
      >
        <Ionicons name="shield-checkmark" size={11} color={ui.green} />
        <Text style={[s.pillText, { color: ui.green }]}>{t('badge')}</Text>
      </Pressable>
      <FairDiceSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** The Settings button that opens the same page. */
export function FairDiceButton() {
  const { t } = useTranslation('fair');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button secondary compact onPress={() => setOpen(true)}>
        {t('settings.button')}
      </Button>
      <FairDiceSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const useStyles = makeStyles((ui) => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${ui.green}55`,
    backgroundColor: `${ui.green}14`,
  },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
}));
