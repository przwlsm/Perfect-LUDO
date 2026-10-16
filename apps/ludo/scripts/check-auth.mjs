// Read-only provider readiness check. Prints settings, never keys or account data.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Auth settings returned HTTP ${response.status}.`);
    const data = await response.json();
    const state = {
      email: Boolean(data.external?.email),
      google: Boolean(data.external?.google),
      facebook: Boolean(data.external?.facebook),
      signupEnabled: !data.disable_signup,
      emailConfirmationRequired: !data.mailer_autoconfirm,
    };
    console.log(JSON.stringify(state, null, 2));
    if (!state.email || !state.google || !state.facebook || !state.signupEnabled) {
      console.log('Provider setup remains incomplete. Follow docs/AUTH_SETUP.md.');
      process.exitCode = 1;
    }
  } catch {
    console.error(
      'Could not read Supabase auth settings. Check network access and public project configuration.',
    );
    process.exitCode = 1;
  }
}
