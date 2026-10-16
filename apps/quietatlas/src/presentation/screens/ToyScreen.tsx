import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { isToyId, type ToyId } from '@/domain/entities/Toy';
import { BowlToy } from '../toys/BowlToy';
import { BubblesToy } from '../toys/BubblesToy';
import { CalligraphyToy } from '../toys/CalligraphyToy';
import { CandleToy } from '../toys/CandleToy';
import { EbruToy } from '../toys/EbruToy';
import { useLook } from '../toys/Looks';
import { RangoliToy } from '../toys/RangoliToy';
import { ToyChromeProvider } from '../toys/ToyChrome';

const SCREENS: Record<ToyId, () => React.JSX.Element> = {
  rangoli: RangoliToy,
  ebru: EbruToy,
  calligraphy: CalligraphyToy,
  bubbles: BubblesToy,
  bowl: BowlToy,
  candle: CandleToy,
};

export function ToyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const known = typeof id === 'string' && isToyId(id);
  useEffect(() => {
    // An unknown link (an old share, a typo) goes home rather than to a blank screen.
    if (!known) router.replace('/');
  }, [known]);
  return known ? <KnownToy id={id} /> : null;
}

function KnownToy({ id }: { id: ToyId }) {
  const { look } = useLook(id);
  const Screen = SCREENS[id];
  return (
    <ToyChromeProvider surface={look.background}>
      <Screen />
    </ToyChromeProvider>
  );
}
