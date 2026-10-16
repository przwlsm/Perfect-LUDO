import * as Network from 'expo-network';
import { AppState } from 'react-native';
import {
  nextConnectionState,
  type ConnectionState,
  type IConnectivityService,
  type Unsubscribe,
} from '@/domain';

/** Resolves true when the game server answered a cheap request. */
export type ReachabilityProbe = () => Promise<boolean>;

const RETRY_BASE_MS = 3000;

/**
 * Device link from expo-network, server reachability from a probe. The two
 * are combined by the domain's transition rule; this class only decides
 * *when* to look: on link changes, on returning to the foreground, on a
 * timer while healthy, and with backoff while not.
 */
export class ExpoConnectivityService implements IConnectivityService {
  private state: ConnectionState = 'CONNECTING';
  private linkUp = true;
  private failures = 0;
  private started = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private probing: Promise<ConnectionState> | null = null;
  private readonly listeners = new Set<(state: ConnectionState) => void>();
  private subscriptions: { remove(): void }[] = [];

  constructor(
    private readonly probe: ReachabilityProbe,
    private readonly intervalMs = 30_000,
  ) {}

  current(): ConnectionState {
    return this.state;
  }

  subscribe(listener: (state: ConnectionState) => void): Unsubscribe {
    this.listeners.add(listener);
    this.start();
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  }

  refresh(): Promise<ConnectionState> {
    return this.probeNow(true);
  }

  private start(): void {
    if (this.started) return;
    this.started = true;
    this.subscriptions = [
      Network.addNetworkStateListener((next) => this.onLink(next)),
      AppState.addEventListener('change', (status) => {
        if (status === 'active') void this.probeNow(true);
      }),
    ];
    void Network.getNetworkStateAsync()
      .then((next) => this.onLink(next))
      .catch(() => void this.probeNow(true));
  }

  private stop(): void {
    this.started = false;
    for (const subscription of this.subscriptions) subscription.remove();
    this.subscriptions = [];
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private onLink(next: Network.NetworkState): void {
    // Unknown is treated as up: the probe, not the OS, has the final word.
    this.linkUp = next.isConnected !== false;
    if (!this.linkUp) {
      this.failures = 0;
      this.set(nextConnectionState(this.state, this.sample(false)));
      this.schedule();
      return;
    }
    // A link coming back is news; a link that was never down is not, and
    // must not flash "reconnecting" over a connection that is still fine.
    if (this.state === 'OFFLINE') this.set(nextConnectionState(this.state, this.sample(null)));
    void this.probeNow(true);
  }

  private sample(serverReachable: boolean | null) {
    return { linkUp: this.linkUp, serverReachable, consecutiveFailures: this.failures };
  }

  private async probeNow(force = false): Promise<ConnectionState> {
    if (this.probing) return this.probing;
    this.probing = (async () => {
      if (!this.linkUp) {
        // Link events can be missed while backgrounded; ask again before giving up.
        const link = await Network.getNetworkStateAsync().catch(() => null);
        if (link?.isConnected === false || (!force && !link)) {
          this.schedule();
          return this.state;
        }
        this.linkUp = true;
      }
      let reachable = false;
      try {
        reachable = await this.probe();
      } catch {
        reachable = false;
      }
      this.failures = reachable ? 0 : this.failures + 1;
      this.set(nextConnectionState(this.state, this.sample(reachable)));
      this.schedule();
      return this.state;
    })().finally(() => {
      this.probing = null;
    });
    return this.probing;
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    if (!this.started) return;
    const delay =
      this.state === 'ONLINE' || this.state === 'OFFLINE'
        ? this.intervalMs
        : Math.min(this.intervalMs, RETRY_BASE_MS * 2 ** Math.min(this.failures, 3));
    this.timer = setTimeout(() => void this.probeNow(), delay);
  }

  private set(next: ConnectionState): void {
    if (next === this.state) return;
    this.state = next;
    for (const listener of this.listeners) listener(next);
  }
}
