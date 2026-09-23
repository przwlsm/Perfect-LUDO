import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { profileService } from '@/config/container';
import { INITIAL_PROFILE, type Profile } from '@/application/store/ProfileService';
import { getBoardTheme } from '../theme/themes';

interface ProfileContextValue {
  profile: Profile;
  ready: boolean;
  error: string | null;
  reload(): Promise<void>;
  perform(action: () => Promise<Profile>): Promise<void>;
}
const ProfileContext = createContext<ProfileContextValue | null>(null);
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function reload() {
    try {
      setProfile(await profileService.load());
      setReady(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile.');
    }
  }
  useEffect(() => {
    let cancelled = false;
    void profileService
      .load()
      .then((loaded) => {
        if (!cancelled) {
          setProfile(loaded);
          setReady(true);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your profile.');
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function perform(action: () => Promise<Profile>) {
    if (!ready) throw new Error('Your profile is still loading.');
    setProfile(await action());
  }
  return (
    <ProfileContext.Provider value={{ profile, ready, error, reload, perform }}>
      {children}
    </ProfileContext.Provider>
  );
}
export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('ProfileProvider is required.');
  return { ...value, theme: getBoardTheme(value.profile.board) };
}
