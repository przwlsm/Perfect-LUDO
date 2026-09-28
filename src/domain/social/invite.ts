/** The server's alphabet: no 0/O or 1/I, so a code read aloud is not misheard. */
const INVITE_CODE = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * Pulls an invite code out of whatever a player pasted or typed: the bare
 * code in any case, with spaces or dashes, or a whole shared message or link
 * ending in `/join/CODE`. Returns null when there is no valid code in it,
 * so the screen can say so before asking the server.
 */
export function parseInviteCode(raw: string): string | null {
  const fromLink = /join\/([A-Za-z0-9-]+)/i.exec(raw)?.[1];
  const code = (fromLink ?? raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return INVITE_CODE.test(code) ? code : null;
}
