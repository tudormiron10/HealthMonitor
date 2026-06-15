const WS_BASE = 'ws://localhost:8000';
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

export interface UserSocketOptions {
  token: string;
  onMessage: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: (code: number) => void;
  onError?: (event: Event) => void;
}

export class UserSocket {
  private readonly _opts: UserSocketOptions;
  private _ws: WebSocket | null = null;
  private _retryDelay = RECONNECT_BASE_MS;
  private _retryTimer: ReturnType<typeof setTimeout> | null = null;
  private _closed = false;

  constructor(opts: UserSocketOptions) {
    this._opts = opts;
    this._connect();
  }

  close(): void {
    this._closed = true;
    if (this._retryTimer !== null) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    this._ws?.close();
    this._ws = null;
  }

  private _connect(): void {
    const url = `${WS_BASE}/ws/user?token=${encodeURIComponent(this._opts.token)}`;
    const ws = new WebSocket(url);
    this._ws = ws;

    ws.onopen = () => {
      this._retryDelay = RECONNECT_BASE_MS;
      this._opts.onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        this._opts.onMessage(JSON.parse(event.data));
      } catch {
        this._opts.onMessage(event.data);
      }
    };

    ws.onerror = (event) => {
      this._opts.onError?.(event);
    };

    ws.onclose = (event) => {
      this._opts.onClose?.(event.code);
      if (this._closed || event.code === 4401) return;
      this._scheduleReconnect();
    };
  }

  private _scheduleReconnect(): void {
    this._retryTimer = setTimeout(() => {
      if (this._closed) return;
      this._retryDelay = Math.min(this._retryDelay * 2, RECONNECT_MAX_MS);
      this._connect();
    }, this._retryDelay);
  }
}
