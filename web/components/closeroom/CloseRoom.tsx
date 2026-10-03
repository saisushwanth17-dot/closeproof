'use client';

import { type FC, useEffect, useState } from 'react';
import type { SourceMode } from '@/lib/constants';
import type { TelemetryEvent } from '@/lib/contracts/contractC';
import type { ReconItem } from '@/lib/contracts/contractB';
import { parseTelemetryLines } from '@/lib/adapter/telemetryParser';
import { useTelemetry } from '@/hooks/useTelemetry';
import { Navbar } from '@/components/layout/Navbar';
import { Hero } from '@/components/layout/Hero';
import { CloseRoomHeader } from '@/components/layout/CloseRoomHeader';
import { ReplayControls } from '@/components/replay/ReplayControls';
import { TelemetryFeed } from '@/components/telemetry/TelemetryFeed';
import { ExceptionQueue } from '@/components/queue/ExceptionQueue';
import { EvidenceDrawer } from '@/components/drawer/EvidenceDrawer';
import { PacketPreview } from '@/components/packet/PacketPreview';
import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';
import { ProcessingPipeline } from '@/components/closeroom/ProcessingPipeline';
import { SourceStatusStrip } from '@/components/closeroom/SourceStatusStrip';
import { DataIntake } from '@/components/intake/DataIntake';
import { WhyNemotron } from '@/components/common/WhyNemotron';
import { getHttpApiUrl } from '@/lib/api/config';
import { dollarsToCents } from '@/lib/formatters';
import {
  type SourceKey,
  type StagedSourceFile,
  type RunLifecycle,
  SAMPLE_SOURCE_BATCH,
} from '@/lib/adapter/ingestion';

type CloseRoomProps = {
  initialMode?: SourceMode;
  initialDemo?: boolean;
};

export const CloseRoom: FC<CloseRoomProps> = ({ initialMode, initialDemo = false }) => {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || '';
  const defaultMode: SourceMode = initialMode ?? (wsUrl ? 'live' : 'replay');

  const [initialEvents, setInitialEvents] = useState<TelemetryEvent[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [stagedFiles, setStagedFiles] = useState<Record<SourceKey, StagedSourceFile | null>>(
    SAMPLE_SOURCE_BATCH
  );
  const [activeTab, setActiveTab] = useState<'closeroom' | 'intake'>('closeroom');
  const [lifecycle, setLifecycle] = useState<RunLifecycle>('ready');
  const [isRunningClose, setIsRunningClose] = useState(false);
  const [packetMarkdown, setPacketMarkdown] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(Boolean(initialDemo));

  // Re-fetch GET /api/runs/{run_id}/packet.md and update preview
  const fetchPacket = async (rId: string) => {
    try {
      const apiUrl = getHttpApiUrl();
      const res = await fetch(`${apiUrl}/api/runs/${encodeURIComponent(rId)}/packet.md`);
      if (res.ok) {
        const md = await res.text();
        setPacketMarkdown(md);
      }
    } catch (err) {
      console.warn('Failed to fetch packet.md:', err);
    }
  };

  // Fetch demo JSONL dataset on client mount for replay mode fallback
  useEffect(() => {
    let isMounted = true;
    fetch('/replay/closeproof-demo.jsonl')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!isMounted) return;
        const parsed = parseTelemetryLines(text);
        const valid = parsed
          .filter((r) => r.ok)
          .map((r) => (r as { ok: true; event: TelemetryEvent }).event);
        setInitialEvents(valid);
      })
      .catch((err) => {
        console.error('Failed to load demo replay JSONL:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const {
    state,
    events,
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
  } = useTelemetry(wsUrl, {
    mode: defaultMode,
    initialEvents,
    autoPlay: true,
  });

  // Track run lifecycle based on state
  useEffect(() => {
    if (state.packetReady) {
      setLifecycle('completed');
    } else if (events.length > 0 && lifecycle !== 'starting') {
      setLifecycle('active');
    }
  }, [state.packetReady, events.length, lifecycle]);

  // Check for ?demo=1 query parameter: hides dev badges, preloads replay, forces dark theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1' || params.get('demo') === 'true' || initialDemo) {
        setIsDemoMode(true);
        switchMode('replay');
        document.documentElement.classList.add('dark');
        try {
          localStorage.setItem('closeproof-theme', 'dark');
        } catch {}
      }
    }
  }, [switchMode, initialDemo]);

  // Live "Run Close" handler calling POST /api/runs
  const handleRunClose = async () => {
    setIsRunningClose(true);
    setLifecycle('starting');
    setActiveTab('closeroom');

    const closeroomEl = document.getElementById('closeroom');
    closeroomEl?.scrollIntoView({ behavior: 'smooth' });

    try {
      const apiUrl = getHttpApiUrl();
      const res = await fetch(`${apiUrl}/api/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const runId: string = data.run_id;
      const items: ReconItem[] = data.items || [];

      setRunId(runId);
      // Immediately fetch live packet on run completion
      fetchPacket(runId);

      // Check WebSocket connection or activate Polling fallback
      const wsTargetUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/telemetry';
      try {
        const testWs = new WebSocket(wsTargetUrl);
        testWs.onopen = () => {
          setConnectionState('connected');
          testWs.close();
        };
        testWs.onerror = () => {
          setConnectionState('polling');
        };
      } catch {
        setConnectionState('polling');
      }

      // Synthesize live telemetry frames from API run for real-time stream animation
      const now = Date.now();
      const liveEvents: TelemetryEvent[] = [
        {
          project: 'closeproof',
          event: 'feed_ingested',
          severity: 'info',
          ts: now,
          payload: { run_id: runId, source: 'bank_stripe_invoices_receipts', count: items.length },
        },
      ];

      items.forEach((item, idx) => {
        if (item.status === 'matched') {
          liveEvents.push({
            project: 'closeproof',
            event: 'recon_match',
            severity: 'info',
            ts: now + (idx + 1) * 150,
            payload: {
              run_id: runId,
              id: item.id,
              amount: item.amount,
              confidence: item.confidence,
              explanation: item.explanation,
              candidates: item.candidates,
              citations: item.citations,
            },
          });
        } else {
          liveEvents.push({
            project: 'closeproof',
            event: 'recon_exception',
            severity: 'warn',
            ts: now + (idx + 1) * 150,
            payload: {
              run_id: runId,
              id: item.id,
              amount: item.amount,
              confidence: item.confidence,
              explanation: item.explanation,
              human_action: item.human_action,
              candidates: item.candidates,
              citations: item.citations,
            },
          });

          if (item.citations && item.citations.length > 0) {
            liveEvents.push({
              project: 'closeproof',
              event: 'tavily_lookup',
              severity: 'info',
              ts: now + (idx + 1) * 200,
              payload: {
                run_id: runId,
                item_id: item.id,
                query: `${item.candidates.find((c) => c.field === 'merchant')?.value || 'vendor'} verification`,
                urls: item.citations,
              },
            });
          }

          if (item.explanation) {
            liveEvents.push({
              project: 'closeproof',
              event: 'explain_done',
              severity: 'info',
              ts: now + (idx + 1) * 250,
              payload: {
                run_id: runId,
                item_id: item.id,
                model_tier: 'ultra',
                confidence: item.confidence,
                explanation: item.explanation,
                recommended_action: item.human_action,
              },
            });
          }
        }
      });

      const matchedItems = items.filter((i) => i.status === 'matched');
      const exceptionItems = items.filter((i) => i.status === 'exception');
      const totalUnreconciledCents = exceptionItems.reduce(
        (acc, item) => acc + Math.abs(dollarsToCents(item.amount)),
        0
      );

      liveEvents.push({
        project: 'closeproof',
        event: 'packet_ready',
        severity: 'info',
        ts: now + (items.length + 2) * 250,
        payload: {
          run_id: runId,
          status: 'ready',
          summary: {
            matched_count: matchedItems.length,
            exception_count: exceptionItems.length,
            total_unreconciled_cents: totalUnreconciledCents,
          },
        },
      });

      // Stream events into state with smooth pacing
      liveEvents.forEach((ev, i) => {
        setTimeout(() => {
          pushTelemetryEvent(ev);
          if (i === liveEvents.length - 1) {
            setLifecycle('completed');
            setIsRunningClose(false);
            fetchPacket(runId);
          }
        }, i * 120);
      });
    } catch (err) {
      console.warn('Live API unavailable or offline, playing demo replay feed:', err);
      setIsRunningClose(false);
      setLifecycle('active');
      play();
    }
  };

  const handleStageFile = (key: SourceKey, file: StagedSourceFile) => {
    setStagedFiles((prev) => ({ ...prev, [key]: file }));
  };

  const handleRemoveFile = (key: SourceKey) => {
    setStagedFiles((prev) => ({ ...prev, [key]: null }));
  };

  const handleLoadSampleBatch = () => {
    setStagedFiles(SAMPLE_SOURCE_BATCH);
  };

  const handleClearAll = () => {
    setStagedFiles({
      bank: null,
      stripe: null,
      invoices: null,
      receipts: null,
    });
  };

  const selectedItem = selectedItemId
    ? state.exceptions[selectedItemId] || state.matchedItems[selectedItemId] || null
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col scroll-smooth">
      {/* 1. Sticky Navigation Bar */}
      <Navbar onRunClose={handleRunClose} isRunning={isRunningClose} />

      {/* 2. Hero Section */}
      <Hero onRunClose={handleRunClose} isRunning={isRunningClose} />

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-10">
          {activeTab === 'intake' ? (
            <DataIntake
              stagedFiles={stagedFiles}
              onStageFile={handleStageFile}
              onRemoveFile={handleRemoveFile}
              onLoadSampleBatch={handleLoadSampleBatch}
              onClearAll={handleClearAll}
              onStartReconciliation={handleRunClose}
              lifecycle={lifecycle}
              mode={mode}
              onSwitchMode={switchMode}
            />
          ) : (
            <>
              {/* 3. Close Room (Stats) Section */}
              <section id="closeroom" className="scroll-mt-18 space-y-4">
                <WorkflowStepper
                  currentStage={state.stage}
                  lifecycle={lifecycle}
                  onSelectStep={(step) => {
                    if (step === 'ingest') setActiveTab('intake');
                    else setActiveTab('closeroom');
                  }}
                />
                <CloseRoomHeader
                  state={state}
                  lifecycle={lifecycle}
                  isDemoMode={isDemoMode}
                  onOpenIntake={() => setActiveTab('intake')}
                />
              </section>

              {/* 4. Pipeline Section */}
              <section id="pipeline" className="scroll-mt-18 space-y-4">
                <SourceStatusStrip
                  stagedFiles={stagedFiles}
                  onOpenIntake={() => setActiveTab('intake')}
                />

                <ProcessingPipeline
                  currentStage={state.stage}
                  lifecycle={lifecycle}
                  eventCount={events.length}
                />

                <ReplayControls
                  mode={mode}
                  state={state.replayState}
                  speed={speed}
                  currentIndex={events.length}
                  totalEvents={events.length}
                  onPlay={() => {
                    setLifecycle('active');
                    play();
                  }}
                  onPause={pause}
                  onResume={resume}
                  onReset={() => {
                    reset();
                    setSelectedItemId(null);
                    setLifecycle('ready');
                  }}
                  onSpeedChange={setSpeed}
                  onModeSwitch={switchMode}
                />
              </section>

              {/* 5. Telemetry Section */}
              <section id="telemetry" className="scroll-mt-18">
                <TelemetryFeed
                  events={events}
                  totalEventsCount={events.length}
                />
              </section>

              {/* 6. Exceptions Section */}
              <section id="exceptions" className="scroll-mt-18">
                <ExceptionQueue
                  exceptions={state.exceptions}
                  demoActions={state.demoActions}
                  selectedItemId={selectedItemId}
                  onSelectItem={(id) => setSelectedItemId(id)}
                />
              </section>

              {/* 7. Packet Section */}
              <section id="packet" className="scroll-mt-18">
                <PacketPreview state={state} markdownContent={packetMarkdown} />
              </section>

              {/* 8. Architecture Section */}
              <section id="architecture" className="scroll-mt-18">
                <WhyNemotron />
              </section>

              {/* Slide-out Right Drawer */}
              <EvidenceDrawer
                item={selectedItem}
                runId={state.runId}
                isOpen={Boolean(selectedItem)}
                onClose={() => setSelectedItemId(null)}
                onActionSuccess={(itemId, action) => {
                  recordDemoAction(itemId, action);
                  setSelectedItemId(null);
                  if (state.runId) {
                    fetchPacket(state.runId);
                  }
                }}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};
