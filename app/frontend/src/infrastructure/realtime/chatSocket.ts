// Pure infrastructure — no React, no global state.
// Wraps the native WebSocket with typed callbacks and exponential-backoff reconnect.
// Close codes 4401 (invalid token) and 4403 (not a party) are terminal — no retry.

const WS_BASE = 'ws://localhost:8000';
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const TERMINAL_CODES = new Set([4401, 4403]);

export interface ChatSocketOptions {
  conversationId: string;
  token: string;
  onMessage: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: (code: number) => void;
  onError?: (event: Event) => void;
}

export class ChatSocket {
  private readonly _opts: ChatSocketOptions;
  private _ws: WebSocket | null = null;
  private _retryDelay = RECONNECT_BASE_MS;
  private _retryTimer: ReturnType<typeof setTimeout> | null = null;
  private _closed = false;

  constructor(opts: ChatSocketOptions) {
    this._opts = opts;
    this._connect();
  }

  send(text: string): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: 'send', text }));
    }
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
    const { conversationId, token } = this._opts;
    const url = `${WS_BASE}/ws/chat/${conversationId}?token=${encodeURIComponent(token)}`;
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
      if (this._closed || TERMINAL_CODES.has(event.code)) return;
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
