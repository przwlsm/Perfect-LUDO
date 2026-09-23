import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { getCosmetic } from '@/domain/cosmetics/catalog';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { Dice } from '../components/Dice';
import { useProfile } from '../state/ProfileProvider';
import { ui } from '../theme/themes';
export default function ProfileScreen() {
  const { profile, theme } = useProfile();
  return (
    <Screen title="Your corner of the club." subtitle="PLAYER PROFILE">
      <Card>
        <View style={shared.row}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 23,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${theme.accent}20`,
              borderWidth: 1,
              borderColor: `${theme.accent}50`,
            }}
          >
            <Text style={{ fontSize: 46, color: theme.accent }}>♙</Text>
          </View>
          <View style={{ gap: 7, flex: 1 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: ui.text }}>{profile.name}</Text>
            <Label color={theme.accent}>
              {profile.wins >= 25
                ? 'CLUB CHAMPION'
                : profile.wins >= 5
                  ? 'TABLE REGULAR'
                  : 'WELCOME TO THE CLUB'}
            </Label>
          </View>
        </View>
        <Button secondary compact onPress={() => router.push('/settings')}>
          Edit profile
        </Button>
      </Card>
      <View style={shared.row}>
        {[
          ['Played', profile.games],
          ['Red wins', profile.wins],
          ['Win rate', `${profile.games ? Math.round((profile.wins / profile.games) * 100) : 0}%`],
        ].map(([label, value]) => (
          <Card key={label} style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: theme.accent, fontSize: 26, fontWeight: '900' }}>{value}</Text>
            <Text style={shared.small}>{label}</Text>
          </Card>
        ))}
      </View>
      <Text style={shared.small}>
        Completed matches on this device. In pass & play, wins track the red seat.
      </Text>
      <Card>
        <Label color={theme.accent}>YOUR SIGNATURE LOOK</Label>
        <View style={shared.between}>
          <View style={{ gap: 9, flex: 1 }}>
            <Text style={shared.sectionTitle}>{getCosmetic(profile.board).name}</Text>
            <Text style={shared.small}>
              {getCosmetic(profile.dice).name} · {profile.board3d ? '3D' : '2D'} view
            </Text>
            <View style={shared.row}>
              {Object.values(theme.colors).map((color) => (
                <View
                  key={color}
                  style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: color }}
                />
              ))}
            </View>
          </View>
          <Dice value={5} finish={profile.dice} />
        </View>
        <Button secondary compact onPress={() => router.push('/store')}>
          Explore your collection · {profile.owned.length} items
        </Button>
      </Card>
      <Card>
        <Label color={theme.accent}>SMALL WINS ADD UP</Label>
        <Text style={shared.sectionTitle}>Play. Collect. Make it yours.</Text>
        <Body>
          Start with 1,000 welcome coins. Claim 250 each day, earn 150 for a solo win, or 40 for
          finishing another solo game. Spend them on a look you love.
        </Body>
      </Card>
    </Screen>
  );
}
