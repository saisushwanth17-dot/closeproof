'use client';

import { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import type { TelemetryEvent } from '@/lib/contracts/contractC';
import type { HumanAction } from '@/lib/contracts/contractB';
import type { ReplaySpeed, SourceMode, ConnectionState, ReplayState } from '@/lib/constants';
import { INITIAL_STATE, closeRoomReducer } from '@/lib/store/reducer';
import type { CloseRoomState } from '@/lib/store/types';
import { createEventBuffer, pushEvent, resetBuffer, type EventBuffer } from '@/lib/store/eventBuffer';
import { WebSocketSource } from '@/lib/adapter/webSocketSource';
import { ReplaySource } from '@/lib/adapter/replaySource';

export type TelemetryOptions = {
  mode?: SourceMode;
  initialEvents?: TelemetryEvent[];
  speed?: ReplaySpeed;
  autoPlay?: boolean;
};

export function useTelemetry(wsUrl?: string, options: TelemetryOptions = {}) {
  const initialMode: SourceMode = options.mode ?? (wsUrl ? 'live' : 'replay');
  const [mode, setMode] = useState<SourceMode>(initialMode);
  const [speed, setSpeedState] = useState<ReplaySpeed>(options.speed ?? 1);

  // Store 2: cumulative reconciliation state
  const [state, dispatch] = useReducer(closeRoomReducer, {
    ...INITIAL_STATE,
    mode: initialMode,
  });

  // Store 1: capped ring buffer (latest 500 events)
  const [buffer, setBuffer] = useState<EventBuffer>(createEventBuffer);

  // Queue of incoming events pending batch dispatch
  const pendingEventsRef = useRef<TelemetryEvent[]>([]);
  const rafIdRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);

  // Source references
  const wsSourceRef = useRef<WebSocketSource | null>(null);
  const replaySourceRef = useRef<ReplaySource | null>(null);

  // Batch process pending events on animation frame
  const flushPendingEvents = useCallback(() => {
    const batch = pendingEventsRef.current;
    if (batch.length === 0) return;
    pendingEventsRef.current = [];

    // Update cumulative state
    batch.forEach((event) => {
      dispatch({ type: 'PROCESS_EVENT', event });
    });

    // Update ring buffer
    setBuffer((prev) => {
      let next = prev;
      batch.forEach((event) => {
        next = pushEvent(next, event);
      });
      return next;
    });
  }, []);

  const queueEvent = useCallback(
    (event: TelemetryEvent) => {
      pendingEventsRef.current.push(event);

      if (rafIdRef.current === null) {
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
          rafIdRef.current = window.requestAnimationFrame(() => {
            rafIdRef.current = null;
            flushPendingEvents();
          });
        } else {
          // Fallback for tests or non-browser environments
          rafIdRef.current = setTimeout(() => {
            rafIdRef.current = null;
            flushPendingEvents();
          }, 0);
        }
      }
    },
    [flushPendingEvents]
  );

  // Setup source when mode or wsUrl changes
  useEffect(() => {
    // Clean up prior sources
    wsSourceRef.current?.disconnect();
    wsSourceRef.current = null;
    replaySourceRef.current?.disconnect();
    replaySourceRef.current = null;

    if (mode === 'live' && wsUrl) {
      const source = new WebSocketSource(wsUrl);
      wsSourceRef.current = source;

      const unbindEvent = source.onEvent((event) => queueEvent(event));
      const unbindMalformed = source.onMalformed(() => {
        dispatch({ type: 'MALFORMED_LINE' });
      });
      const unbindState = source.onStateChange((connState) => {
        dispatch({ type: 'SET_CONNECTION_STATE', state: connState as ConnectionState });
      });

      source.connect();

      return () => {
        unbindEvent();
        unbindMalformed();
        unbindState();
        source.disconnect();
      };
    } else if (mode === 'replay') {
      const events = options.initialEvents ?? [];
      const source = new ReplaySource(events);
      replaySourceRef.current = source;
      source.setSpeed(speed);

      const unbindEvent = source.onEvent((event) => queueEvent(event));
      const unbindMalformed = source.onMalformed(() => {
        dispatch({ type: 'MALFORMED_LINE' });
      });
      const unbindState = source.onStateChange((repState) => {
        dispatch({ type: 'SET_REPLAY_STATE', state: repState as ReplayState });
      });

      if (options.autoPlay !== false) {
        source.connect();
      }

      return () => {
        unbindEvent();
        unbindMalformed();
        unbindState();
        source.disconnect();
      };
    }
  }, [mode, wsUrl, options.initialEvents, options.autoPlay, queueEvent, speed]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        if (typeof rafIdRef.current === 'number' && typeof window !== 'undefined' && window.cancelAnimationFrame) {
          window.cancelAnimationFrame(rafIdRef.current);
        } else {
          clearTimeout(rafIdRef.current);
        }
        rafIdRef.current = null;
      }
    };
  }, []);

  // Controls
  const play = useCallback(() => {
    replaySourceRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    replaySourceRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    replaySourceRef.current?.resume();
  }, []);

  const reset = useCallback(() => {
    pendingEventsRef.current = [];
    if (rafIdRef.current !== null) {
      if (typeof rafIdRef.current === 'number' && typeof window !== 'undefined' && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(rafIdRef.current);
      } else {
        clearTimeout(rafIdRef.current);
      }
      rafIdRef.current = null;
    }
    replaySourceRef.current?.reset();
    setBuffer(resetBuffer());
    dispatch({ type: 'RESET' });
  }, []);

  const setSpeed = useCallback((newSpeed: ReplaySpeed) => {
    setSpeedState(newSpeed);
    replaySourceRef.current?.setSpeed(newSpeed);
  }, []);

  const recordDemoAction = useCallback((itemId: string, action: HumanAction) => {
    dispatch({ type: 'RECORD_DEMO_ACTION', itemId, action });
  }, []);

  const switchMode = useCallback(
    (newMode: SourceMode) => {
      reset();
      setMode(newMode);
      dispatch({ type: 'SET_MODE', mode: newMode });
    },
    [reset]
  );

  const pushTelemetryEvent = useCallback((event: TelemetryEvent) => {
    dispatch({ type: 'PROCESS_EVENT', event });
    setBuffer((prev) => pushEvent(prev, event));
  }, []);

  const setConnectionState = useCallback((connState: ConnectionState) => {
    dispatch({ type: 'SET_CONNECTION_STATE', state: connState });
  }, []);

  const setRunId = useCallback((runId: string) => {
    dispatch({ type: 'SET_RUN_ID', runId });
  }, []);

  return {
    state,
    events: buffer.events,
    totalEvents: buffer.totalPushed,
    mode,
    speed,
    play,
    pause,
    resume,
    reset,
    setSpeed,
    recordDemoAction,
    switchMode,
    pushTelemetryEvent,
    setConnectionState,
    setRunId,
  };
}
