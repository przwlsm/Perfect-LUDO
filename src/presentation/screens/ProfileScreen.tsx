import { useAuthSession } from '../state/useAuthSession';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { getCosmetic } from '@/domain/cosmetics/catalog';
import { Body, Button, Card, Label, Screen, shared } from '../components/Kit';
import { Dice } from '../components/Dice';
import { useProfile } from '../state/ProfileProvider';
import { SocialIdentityCard } from '../social/SocialIdentityCard';
import { ui } from '../theme/themes';
export default function ProfileScreen() {
  const { profile, theme, syncWarning, reload, member, wallet, refreshWallet } = useProfile();
  const auth = useAuthSession();
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
      <SocialIdentityCard />
      <View style={shared.row}>
        {[
          ['Played', profile.games],
          ['Wins', profile.wins],
          ['Win rate', `${profile.games ? Math.round((profile.wins / profile.games) * 100) : 0}%`],
        ].map(([label, value]) => (
          <Card key={label} style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: theme.accent, fontSize: 26, fontWeight: '900' }}>{value}</Text>
            <Text style={shared.small}>{label}</Text>
          </Card>
        ))}
      </View>
      <View style={shared.row}>
        {[
          ['Win streak', profile.streak],
          ['Best streak', profile.bestStreak],
        ].map(([label, value]) => (
          <Card key={label} style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: theme.accent, fontSize: 26, fontWeight: '900' }}>{value}</Text>
            <Text style={shared.small}>{label}</Text>
          </Card>
        ))}
      </View>
      <Text style={shared.small}>
        {member
          ? 'Completed matches on your account. In pass & play, wins track the red seat.'
          : 'Completed matches on this device. In pass & play, wins track the red seat.'}
      </Text>
      {member && (
        <Card>
          <Label color={theme.accent}>YOUR COINS</Label>
          <View style={shared.between}>
            <Text style={{ color: theme.accent, fontSize: 30, fontWeight: '900' }}>
              ◉ {wallet === 'ready' ? profile.coins.toLocaleString() : '—'}
            </Text>
            <Button secondary compact onPress={() => router.push('/store')}>
              Open store
            </Button>
          </View>
          {wallet !== 'ready' ? (
            <>
              <Text accessibilityLiveRegion="polite" style={shared.error}>
                Your coins could not be loaded from your account. Spending is paused until they are.
              </Text>
              <Button secondary compact onPress={() => void refreshWallet()}>
                Reload coins
              </Button>
            </>
          ) : profile.pendingRewards.length > 0 ? (
            <Text style={shared.small}>
              {profile.pendingRewards.length} finished game
              {profile.pendingRewards.length === 1 ? '' : 's'} still waiting to be paid. They will
              be added the next time your account answers.
            </Text>
          ) : (
            <Text style={shared.small}>
              Kept on your account, so they follow you to any device.
            </Text>
          )}
        </Card>
      )}
      {/* Guests get their offer in the identity card above; this one is for accounts. */}
      {!auth.user?.isGuest && (
        <Card>
          <Label color={theme.accent}>ACCOUNT</Label>
          {syncWarning && (
            <>
              <Text accessibilityLiveRegion="polite" style={shared.error}>
                {syncWarning}
              </Text>
              <Button secondary compact onPress={() => void reload()}>
                Retry cloud sync
              </Button>
            </>
          )}
          <Body>
            {auth.user
              ? 'Your coins, collection and statistics are kept on your account.'
              : 'Sign in to play with friends and to earn, keep and spend coins. Coins and unlocked looks live on your account, not on this device.'}
          </Body>
          <Button secondary compact onPress={() => router.push('/login')}>
            {auth.user ? 'Manage account' : 'Sign in or create an account'}
          </Button>
        </Card>
      )}
      <Card>
        <Label color={theme.accent}>YOUR SIGNATURE LOOK</Label>
        <View style={shared.between}>
          <View style={{ gap: 9, flex: 1 }}>
            <Text style={shared.sectionTitle}>{getCosmetic(profile.board).name}</Text>
            <Text style={shared.small}>
              {getCosmetic(profile.dice).name} · {profile.board3d ? '3D' : '2D'} view
            </Text>
            <View style={[shared.row, { flexWrap: 'wrap' }]}>
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
          Every account starts with 1,000 welcome coins. Claim 250 each day, earn 150 for a win, or
          40 for finishing a game. Spend them on a look you love.
        </Body>
      </Card>
      <Card>
        <Label color={theme.accent}>WE’RE LISTENING</Label>
        <Text style={shared.sectionTitle}>Found a bug? Have an idea?</Text>
        <Body>Tell us what’s working, what isn’t, and what you’d like to see next.</Body>
        <Button secondary compact onPress={() => router.push('/feedback')}>
          Send feedback
        </Button>
      </Card>
    </Screen>
  );
}
