import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Activity,
  HeartPulse,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type { PatientTicket, QueueSnapshot } from '../../queue/types';

interface LobbyDisplayBoardProps {
  snapshot: QueueSnapshot;
}

export default function LobbyDisplayBoard({ snapshot }: LobbyDisplayBoardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const prevCalledTicketIdRef = useRef<string | null>(null);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Find the most recently called patient across all departments
  const calledTickets = snapshot.tickets
    .filter((t) => t.status === 'CALLED')
    .sort((a, b) => new Date(b.calledAt ?? 0).getTime() - new Date(a.calledAt ?? 0).getTime());

  const latestCalled = calledTickets[0] ?? null;

  // Active consultations ("Now Serving")
  const consultingTickets = snapshot.tickets.filter((t) => t.status === 'IN_CONSULTATION');

  // Pleasant Web Audio Chime Synthesis on new call
  useEffect(() => {
    if (latestCalled && latestCalled.id !== prevCalledTicketIdRef.current) {
      prevCalledTicketIdRef.current = latestCalled.id;
      if (audioEnabled) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
        } catch {
          /* ignore audio restrictions */
        }
      }
    }
  }, [latestCalled, audioEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`bg-slate-950 text-white font-sans ${isFullscreen ? 'fixed inset-0 z-50 p-8 overflow-y-auto' : 'rounded-2xl p-6 shadow-2xl border border-slate-800'}`}>
      {/* Top TV Display Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                Sanctuary+ OPD Central Display
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Public Monitor
              </span>
            </div>
            <p className="text-xs text-slate-400">Live Department Calling & Room Allocation System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xl font-mono font-bold text-teal-300 tracking-wider">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-xs text-slate-400 font-medium">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                audioEnabled
                  ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={audioEnabled ? 'Audio Chime Enabled' : 'Enable Audio Chime'}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: WOW Moment 1 (Now Calling Banner) + Now Serving Matrix */}
      <div className="space-y-6">
        {/* NOW CALLING FLASH BANNER */}
        {latestCalled ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-800 to-slate-900 border-2 border-teal-400 p-8 shadow-2xl text-center">
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-md animate-pulse">
                <Sparkles className="h-4 w-4" />
                NOW CALLING
              </span>
            </div>

            <div className="pt-8 pb-4">
              <div className="text-7xl sm:text-8xl md:text-9xl font-black font-mono tracking-tight text-white leading-none my-2 drop-shadow-md">
                {latestCalled.tokenNumber}
              </div>

              <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
                <span className="text-sm md:text-base text-teal-200 font-semibold">Please Proceed To:</span>
                <span className="text-2xl md:text-3xl font-black text-white">
                  Room {latestCalled.assignedRoomNumber ?? 'OPD Room'}
                </span>
                <span className="text-sm md:text-base text-slate-300">
                  ({latestCalled.departmentName})
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-sm">
            Waiting for next patient call announcement. Please view active consultation rooms below.
          </div>
        )}

        {/* NOW SERVING GRID */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm md:text-base font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Now Serving &bull; Active OPD Rooms
            </h2>
            <span className="text-xs text-slate-500">Privacy Protected: Token Numbers Only</span>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {snapshot.rooms.map((r) => {
              const dept = snapshot.departments.find((d) => d.id === r.departmentId);
              const activeTkt = snapshot.tickets.find(
                (t) => t.assignedRoomId === r.id && (t.status === 'IN_CONSULTATION' || t.status === 'CALLED')
              );

              return (
                <div
                  key={r.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    activeTkt
                      ? 'bg-slate-900 border-teal-500/40 shadow-lg shadow-teal-500/5'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-400">Room {r.roomNumber}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeTkt?.status === 'CALLED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          : activeTkt?.status === 'IN_CONSULTATION'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {activeTkt?.status === 'CALLED'
                        ? 'CALLED'
                        : activeTkt?.status === 'IN_CONSULTATION'
                        ? 'IN CONSULT'
                        : 'AVAILABLE'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 truncate mb-2">{dept?.name ?? 'OPD'}</p>

                  <div className="mt-2 text-center py-2 bg-slate-950/80 rounded-xl border border-slate-800">
                    <p className="text-2xl font-black font-mono text-white tracking-wider">
                      {activeTkt ? activeTkt.tokenNumber : '—'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {activeTkt ? 'Token Serving' : 'Awaiting Call'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Public Notice Footer */}
        <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>
            Patients are advised to monitor the display board and their mobile token tracker.
          </span>
          <span className="text-teal-400 font-semibold">
            Sanctuary+ Smart Healthcare Platform &bull; Hackathon Live Demo
          </span>
        </div>
      </div>
    </div>
  );
}
