/** Only authorization codes are accepted; never import arbitrary sessions from URL fragments. */
export function parseAuthCallback(url: string): {
  code: string;
  recovery: boolean;
  flowId?: string;
} {
  const parsed = new URL(url);
  if (parsed.searchParams.has('error') || parsed.hash.includes('error=')) {
    throw new Error('Sign-in was cancelled or the link expired. Please try again.');
  }
  const code = parsed.searchParams.get('code');
  if (!code || code.length > 4096) {
    throw new Error(
      'This link is invalid or already used. Request a new email or enter its verification code.',
    );
  }
  return {
    code,
    recovery: parsed.searchParams.get('flow') === 'recovery',
    flowId: parsed.searchParams.get('sb_flow_id') ?? undefined,
  };
}
