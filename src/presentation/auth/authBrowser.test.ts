import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { authProvider } from '@/config/container';
import { authRedirect, signInWithSocial } from './authBrowser';

jest.mock('@/config/container', () => ({
  authProvider: { getOAuthUrl: jest.fn(), completeRedirect: jest.fn() },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
}));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
const oauth = authProvider!.getOAuthUrl as jest.Mock;
const complete = authProvider!.completeRedirect as jest.Mock;
const open = WebBrowser.openAuthSessionAsync as jest.Mock;

describe('native social authentication browser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    Constants.executionEnvironment = 'bare' as typeof Constants.executionEnvironment;
    oauth.mockResolvedValue('https://project.test/auth/v1/authorize');
  });
  it('uses the installed application callback for login and recovery', () => {
    expect(authRedirect()).toBe('perfectludo://auth/callback');
    expect(authRedirect(true)).toBe('perfectludo://auth/callback?flow=recovery');
  });
  it('returns cancellation without completing a session', async () => {
    open.mockResolvedValueOnce({ type: 'cancel' });
    expect(await signInWithSocial('google')).toBeNull();
    expect(complete).not.toHaveBeenCalled();
  });
  it('completes a successful browser result using the shared exchange handler', async () => {
    open.mockResolvedValueOnce({ type: 'success', url: 'perfectludo://auth/callback?code=test' });
    complete.mockResolvedValueOnce({ user: { uid: 'a', email: null }, recovery: false });
    expect(await signInWithSocial('facebook')).toMatchObject({ user: { uid: 'a' } });
    expect(complete).toHaveBeenCalledWith('perfectludo://auth/callback?code=test');
    expect(open).toHaveBeenCalledWith(
      'https://project.test/auth/v1/authorize',
      'perfectludo://auth/callback',
    );
  });
  it('explains why Expo Go cannot handle the installed app scheme', async () => {
    Constants.executionEnvironment = 'storeClient' as typeof Constants.executionEnvironment;
    await expect(signInWithSocial('google')).rejects.toThrow('development build');
    expect(oauth).not.toHaveBeenCalled();
  });
});
