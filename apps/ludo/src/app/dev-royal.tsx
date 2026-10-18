// TEMPORARY preview route for checking the Royal Road card on web. Delete before committing.
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { RoyalRoadCard } from '@/presentation/collection/RoyalRoadCard';
import { VictoryScreen } from '@/presentation/game/VictoryScreen';
import { HallCard } from '@/presentation/collection/HallCard';
import { ThroneArt } from '@/presentation/collection/ThroneArt';
import { ACHIEVEMENT_GROUPS, ACHIEVEMENTS, CUPS, getCup } from '@/domain';
import { GemGuide } from '@/presentation/components/GemGuide';
import { ThroneHallCard } from '@/presentation/collection/ThroneHallCard';
import { CollectionCard } from '@/presentation/collection/CollectionCard';
import { MedalShelf } from '@/presentation/screens/CollectionScreen';

export default function DevRoyal() {
  const { v } = useLocalSearchParams<{ v?: string }>();
  if (v === '4') {
    const won: Record<string, number> = {
      village: 3,
      merchant: 2,
      knight: 1,
      baron: 1,
      emperor: 1,
    };
    const tiers = Object.fromEntries(ACHIEVEMENTS.map((a, i) => [a.id, i % 5]));
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, backgroundColor: '#0b1020' }}>
        <CollectionCard />
        <ThroneHallCard wonCount={(id) => won[id] ?? 0} motion />
        {ACHIEVEMENT_GROUPS.slice(0, 2).map((g) => (
          <MedalShelf
            key={g}
            group={g}
            tierOf={(id) => tiers[id] ?? 0}
            isNew={(id) => id === ACHIEVEMENTS[1]!.id}
            motion
            onOpen={() => undefined}
          />
        ))}
      </ScrollView>
    );
  }
  if (v === '3')
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, backgroundColor: '#0b1020' }}>
        <GemGuide />
      </ScrollView>
    );
  if (v === '2')
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, backgroundColor: '#0b1020' }}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 18,
            justifyContent: 'center',
            paddingVertical: 20,
          }}
        >
          {CUPS.map((c) => (
            <ThroneArt key={c.id} cup={c} won size={70} shine />
          ))}
        </View>
        {CUPS.map((c, i) => (
          <HallCard
            key={c.id}
            cup={getCup(c.id)!}
            hall={{
              id: c.id,
              entry: c.entry,
              prize: c.prize,
              runnerUp: c.runnerUp,
              variant: c.variant,
              waiting: i % 3,
              won: i === 1 ? 2 : 0,
            }}
            coins={30000}
            busy={null}
            locked={false}
            motion
            onEnter={() => undefined}
            onFriends={() => undefined}
          />
        ))}
      </ScrollView>
    );
  if (v === '1')
    return (
      <VictoryScreen
        visible
        outcome="win"
        banner="YOU WIN!"
        subtitle="YOU BEAT YOUR RIVAL"
        standings={[
          { key: 'red', name: 'You', color: '#ef4444', you: true, coinsHome: 2, avatar: null },
          { key: 'green', name: 'Priya', color: '#10b981', you: false, coinsHome: 1, avatar: null },
        ]}
        reward={null}
        note="Placement pay goes to your vault."
        stats={null}
        durationMs={null}
        goal={2}
        primary={{ label: 'Play again', onPress: () => undefined }}
        secondary={{ label: 'Home', onPress: () => undefined }}
        invite={{
          title: 'Ready for a throne?',
          body: 'Royal Road cups: four players, two rounds of Quick 2. About 6 min a game, 12 min for the whole cup.',
          cta: 'See the cups',
          onPress: () => undefined,
        }}
        motionEnabled
      />
    );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, backgroundColor: '#0b1020' }}>
      <RoyalRoadCard
        gameMinutes={6}
        cupMinutes={12}
        measured={false}
        motion
        onPress={() => undefined}
      />
      <View style={{ backgroundColor: '#f7f3ea', padding: 16, borderRadius: 12 }}>
        <RoyalRoadCard
          gameMinutes={7}
          cupMinutes={14}
          measured
          motion={false}
          onPress={() => undefined}
        />
      </View>
    </ScrollView>
  );
}
