# Authentication setup

The app implements email/password signup and login, Google/Facebook browser OAuth, confirmation/resend, email-code verification, password recovery/change, persisted sessions, logout, and guest play. Player names are display names, not login identifiers. New passwords require at least eight characters; existing shorter passwords remain usable for sign-in.

Run `npm run auth:check` to repeat the read-only provider readiness check.

## Current deployment status

The project's public `/auth/v1/settings` endpoint was checked during implementation: email is enabled, signup is enabled, email confirmation is required, and Google/Facebook are disabled. App code alone cannot enable these providers. Their developer credentials must be entered in the Supabase dashboard by the project owner. Never add provider secrets or a Supabase service-role key to `EXPO_PUBLIC_*` variables.

## Supabase redirects

Set Authentication > URL Configuration > Site URL to your deployed HTTPS website. Add these redirect URLs, substituting your real web origin:

- `perfectludo://auth/callback`
- `perfectludo://auth/callback?flow=recovery`
- `https://YOUR-WEB-DOMAIN/auth/callback`
- `https://YOUR-WEB-DOMAIN/auth/callback?flow=recovery`
- During local web development only: `http://localhost:8081/auth/callback` and `http://localhost:8081/auth/callback?flow=recovery`. Add the actual port/origin if different (127.0.0.1 and localhost are different origins).

Keep the same web origin from login start through callback. Configure your static host to serve the app's index.html for `/auth/callback`, `/auth/reset`, and other Expo Router paths. PKCE code exchange is handled by the callback screen, so automatic URL-session detection is disabled in the Supabase client. Session tokens from arbitrary URL fragments are not accepted.

Use an installed app/development build for native OAuth, with the existing `perfectludo` scheme. Expo Go does not provide this app's custom callback scheme. `expo-web-browser` is now a direct SDK-compatible dependency and config plugin; rebuild the native development client. Production native identity still requires your registered Android package/iOS bundle identifier in the existing build configuration.

## Google

1. Create/configure your Google Cloud project's OAuth consent screen (app name, support email, audience, authorized domains, required public URLs).
2. Create a Web application OAuth client. This implementation uses Supabase's browser OAuth on web and native.
3. Copy the callback URL displayed in Supabase > Authentication > Sign In / Providers > Google, normally `https://YOUR-PROJECT.supabase.co/auth/v1/callback`. Register that exact URL as a Google authorized redirect URI.
4. Enter the Google Client ID and Client Secret in Supabase's Google provider settings, then enable/save the provider.
5. Add test users while the Google application is in testing; complete Google's publication/verification steps appropriate to your application before public release.

Google's redirect goes to Supabase, which then redirects to the app URL above. These are two different callbacks.

## Facebook

1. Create a Meta developer application and configure Facebook Login for the relevant use case.
2. Register the callback shown in Supabase's Facebook provider settings as a valid OAuth redirect URI. Configure the app domains and required privacy/data-deletion URLs in Meta.
3. Enter the Facebook App ID and App Secret in Supabase > Authentication > Sign In / Providers > Facebook; enable/save it.
4. Test with the app's allowed developer/test users. Complete Meta's required publication and permission steps so ordinary players can sign in.

## Email delivery and verification

1. Keep email confirmation enabled. Set the server minimum password length to at least 8 to match the signup/reset UI.
2. Configure a production SMTP sender in Supabase; the development email service is not suitable for unrestricted production delivery.
3. Paste `supabase/templates/confirmation.html` into the Confirm signup template, and `supabase/templates/recovery.html` into Reset password.
4. Keep both `{{ .ConfirmationURL }}` and `{{ .Token }}`. The app accepts the code with Supabase `verifyOtp`, so a player can read an email on another device. PKCE links must return to the app/browser that initiated the request; if that verifier is unavailable, use the email code or sign in after confirming.
5. Reset requests use a generic acknowledgement regardless of account existence. Server email/attempt limits remain authoritative; the UI also has a resend cooldown.

## Profiles and sessions

The Supabase SDK persists sessions in the existing storage adapter and refreshes native sessions while the app is active. Signup with a user record but no session remains unverified. Restored sessions trigger profile loading. Account changes archive the current device profile and restore the matching account or guest snapshot; account A's local collection never seeds account B directly. Guest progress may seed a newly used account.

Coins, the cosmetic inventory, the daily gift and match statistics are account features held on the server (migration `0007_account_wallet.sql`). A signed-in member's device only mirrors the last wallet the server returned; purchases, gifts and rewards are server functions that run as one transaction and are idempotent per item and per match, so a request that is retried, double-tapped or interrupted by the app closing is applied once. The client can write only its display name to `profiles`; every numeric column is closed to it. Guests and signed-out players see no balance and are sent to sign in from the coin pill, the store and the gift card; their local play never mints coins. A match finished while the server is unreachable is counted on the device and queued; it is paid the next time the account answers (app foreground, connectivity restored, or a manual reload from the profile screen). Coins remain entertainment currency with no cash value.

Cloud profile synchronization otherwise covers the display name and best-effort games/wins/streak statistics for guests.

Cloud sync failure preserves local play and shows a retry option on the account screen. When the wallet cannot be loaded the balance shows as unavailable and spending is paused until a reload succeeds; equipping already-owned looks keeps working. Supabase RLS migrations must be applied for the `profiles` table. The app retains password sessions only through the auth SDK; passwords and callback codes are not logged or saved in player profiles.

## Release verification

Automated adapter tests cover pending confirmation, OAuth redirects, duplicate/expired callbacks, recovery codes, session restoration and authenticated password updates. Profile tests cover guest restoration/account isolation. Browser mock tests exercise screens without creating real accounts or sending email.

After enabling providers and SMTP, test real Google and Facebook accounts on web, Android and iOS; cancellation; cold-start callbacks; confirmation and resend; password reset via link and code; expiry/reuse; logout/restart; switching accounts; and offline guest play. Mock tests and successful exports do not substitute for live provider/device tests.

Official references: [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [redirects](https://supabase.com/docs/guides/auth/redirect-urls), [Expo SDK 57 WebBrowser](https://docs.expo.dev/versions/v57.0.0/sdk/webbrowser/).
