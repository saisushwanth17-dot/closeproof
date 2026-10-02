import type { TelemetrySource, EventCallback, MalformedCallback, StateCallback } from './telemetrySource';
import type { ConnectionState } from '@/lib/constants';
import { parseTelemetryLine } from './telemetryParser';

export class WebSocketSource implements TelemetrySource {
  private url: string;
  private ws: WebSocket | null = null;
  private eventListeners: Set<EventCallback> = new Set();
  private malformedListeners: Set<MalformedCallback> = new Set();
  private stateListeners: Set<StateCallback> = new Set();
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDisposed = false;

  constructor(url: string) {
    this.url = url;
  }

  private setState(newState: ConnectionState) {
    this.state = newState;
    this.stateListeners.forEach((listener) => listener(newState));
  }

  public connect(): void {
    if (this.ws || this.isDisposed) return;

    this.setState('connecting');
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        if (this.isDisposed) {
          this.ws?.close();
          return;
        }
        this.reconnectAttempts = 0;
        this.setState('connected');
      };

      this.ws.onmessage = (event) => {
        if (this.isDisposed) return;
        const text = typeof event.data === 'string' ? event.data : '';
        const lines = text.split('\n').filter((l) => l.trim().length > 0);

        for (const line of lines) {
          const result = parseTelemetryLine(line);
          if (result.ok) {
            this.eventListeners.forEach((listener) => listener(result.event));
          } else {
            this.malformedListeners.forEach((listener) => listener(result.error, result.raw));
          }
        }
      };

      this.ws.onerror = () => {
        if (this.isDisposed) return;
        // On error, let onclose handle reconnection
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.isDisposed) return;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts += 1;
          this.setState('reconnecting');
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
          this.reconnectTimer = setTimeout(() => {
            if (!this.isDisposed) {
              this.connect();
            }
          }, delay);
        } else {
          this.setState('disconnected');
        }
      };
    } catch {
      this.setState('disconnected');
    }
  }

  public disconnect(): void {
    this.isDisposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }

  public onEvent(callback: EventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  public onMalformed(callback: MalformedCallback): () => void {
    this.malformedListeners.add(callback);
    return () => this.malformedListeners.delete(callback);
  }

  public onStateChange(callback: StateCallback): () => void {
    this.stateListeners.add(callback);
    callback(this.state);
    return () => this.stateListeners.delete(callback);
  }
}
