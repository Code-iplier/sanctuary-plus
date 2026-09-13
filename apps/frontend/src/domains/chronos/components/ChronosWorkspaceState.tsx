import React from 'react';
import { Card } from '@heroui/react';
import { CircleAlert, Radio, RefreshCw, ServerCrash, Wifi } from 'lucide-react';
import type { ChronosConnectionState } from '../hooks/useChronos';

const COPY: Record<
  Exclude<ChronosConnectionState, 'LIVE'>,
  { title: string; detail: string }
> = {
  INITIALIZING: {
    title: 'Initializing Chronos workspace',
    detail: 'Checking the prediction service before clinical data is shown.',
  },
  CONNECTING: {
    title: 'Connecting to the live triage stream',
    detail:
      'Chronos is available. The workspace will populate when its event channel reconnects.',
  },
  WAITING: {
    title: 'Chronos is ready',
    detail: 'Waiting for the first streamed patient update.',
  },
  STALE: {
    title: 'Displaying retained patient data',
    detail:
      'Chronos is currently unreachable. Values below may be stale until the service reconnects.',
  },
  OFFLINE: {
    title: 'Chronos is unavailable',
    detail:
      'The prediction service could not be reached. No clinical predictions are being received.',
  },
  PAUSED: {
    title: 'Replay stream paused',
    detail: 'Patient replay stream is paused. Click Play in the header to resume.',
  },
  RESTARTING: {
    title: 'Replay stream restarting',
    detail: 'Resetting patient history and restarting the replay stream.',
  },
  COMPLETE: {
    title: 'Replay stream complete',
    detail: 'All recorded MIMIC events have been replayed. Click Restart to replay again.',
  },
};

function Skeleton({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-slate-100 ${className}`}
    />
  );
}

export function ChronosWorkspaceState({
  state,
}: {
  state: Exclude<ChronosConnectionState, 'LIVE'>;
}) {
  const copy = COPY[state] ?? COPY.WAITING;
  const Icon =
    state === 'OFFLINE' || state === 'STALE'
      ? ServerCrash
      : state === 'WAITING'
        ? Radio
        : state === 'CONNECTING'
          ? Wifi
          : RefreshCw;
  const isUnavailable = state === 'OFFLINE' || state === 'STALE';

  return (
    <section
      className="chronos-state-workspace"
      aria-live="polite"
      aria-busy={!isUnavailable}
    >
      <Card
        className={`chronos-state-message ${isUnavailable ? 'is-error' : ''}`}
      >
        <div className="chronos-state-icon">
          <Icon size={18} />
        </div>
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.detail}</p>
        </div>
        {isUnavailable ? (
          <CircleAlert size={17} aria-label="Service unavailable" />
        ) : null}
      </Card>
      {!isUnavailable && (
        <div
          className="chronos-skeleton-layout"
          aria-label="Preparing the triage workspace"
        >
          <Card className="p-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-4 h-7 w-16" />
            <Skeleton className="mt-3 h-2 w-full" />
          </Card>
          <Card className="p-4">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mt-4 h-7 w-20" />
            <Skeleton className="mt-3 h-2 w-4/5" />
          </Card>
          <Card className="p-4 chronos-skeleton-list">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-5 h-16 w-full" />
            <Skeleton className="mt-3 h-16 w-full" />
            <Skeleton className="mt-3 h-16 w-full" />
          </Card>
          <Card className="p-4 chronos-skeleton-detail">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-5 h-24 w-full" />
            <Skeleton className="mt-3 h-12 w-full" />
          </Card>
        </div>
      )}
    </section>
  );
}
