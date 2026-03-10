import { memo, useMemo, useState, useRef, useCallback } from 'react';
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff, Volume2, VolumeX, User, Users, GripHorizontal, LogOut } from 'lucide-react';
import { useAudioCall } from './AudioCallProvider';

/* =====================================================
   HOOK: reusable drag-to-reposition logic
===================================================== */
const useDraggable = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [useCustomPos, setUseCustomPos] = useState(false);
  const dragRef = useRef(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e) => {
    dragging.current = true;
    const rect = dragRef.current?.closest('[data-draggable-popup]')?.getBoundingClientRect();
    if (!rect) return;
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const el = dragRef.current?.closest('[data-draggable-popup]');
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const nx = Math.max(0, Math.min(window.innerWidth - w, e.clientX - offset.current.x));
    const ny = Math.max(0, Math.min(window.innerHeight - h, e.clientY - offset.current.y));
    setPos({ x: nx, y: ny });
    setUseCustomPos(true);
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const style = useCustomPos
    ? { left: pos.x, top: pos.y, right: 'auto' }
    : { top: 16, right: 16 };

  return { dragRef, onPointerDown, onPointerMove, onPointerUp, style };
};

/* =====================================================
   HELPER: format seconds → "00:00"
===================================================== */
const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/* =====================================================
   FLOATING INCOMING CALL POPUP — small top-right card
===================================================== */
export const IncomingCallPopup = memo(() => {
  const { callState, incomingCall, acceptCall, rejectCall } = useAudioCall();
  const { dragRef, onPointerDown, onPointerMove, onPointerUp, style } = useDraggable();

  if (callState !== 'ringing-in' || !incomingCall) return null;

  return (
    <div
      data-draggable-popup
      className="fixed z-[60] w-72 bg-gray-900 rounded-2xl shadow-2xl shadow-black/40 border border-gray-700 overflow-hidden animate-slide-in"
      style={style}
    >
      {/* Drag handle + Green accent bar at top */}
      <div className="h-7 bg-gradient-to-r from-green-400 to-emerald-500 flex items-center px-3 gap-2">
        <div
          ref={dragRef}
          className="cursor-grab active:cursor-grabbing touch-none text-white/70 hover:text-white transition-colors"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <GripHorizontal className="w-4 h-4" />
        </div>
        <span className="text-white/80 text-[10px] font-medium select-none">Incoming Call</span>
      </div>

      <div className="p-4">
        {/* Caller info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <PhoneIncoming className="w-5 h-5 text-green-400 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold truncate">
              {incomingCall.callerName}
            </p>
            <p className="text-gray-400 text-xs truncate">
              Incoming call · #{incomingCall.channelName || 'channel'}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={rejectCall}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-xl text-xs font-medium transition-colors"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            Decline
          </button>
          <button
            onClick={acceptCall}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-xs font-medium transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
});
IncomingCallPopup.displayName = 'IncomingCallPopup';

/* =====================================================
   FLOATING OUTGOING CALL POPUP — small top-right card
===================================================== */
export const OutgoingCallPopup = memo(() => {
  const { callState, callChannelName, leaveCall } = useAudioCall();
  const { dragRef, onPointerDown, onPointerMove, onPointerUp, style } = useDraggable();

  if (callState !== 'ringing-out' && callState !== 'connecting') return null;

  return (
    <div
      data-draggable-popup
      className="fixed z-[60] w-72 bg-gray-900 rounded-2xl shadow-2xl shadow-black/40 border border-gray-700 overflow-hidden animate-slide-in"
      style={style}
    >
      {/* Drag handle + Emerald accent bar */}
      <div className="h-7 bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center px-3 gap-2">
        <div
          ref={dragRef}
          className="cursor-grab active:cursor-grabbing touch-none text-white/70 hover:text-white transition-colors"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <GripHorizontal className="w-4 h-4" />
        </div>
        <span className="text-white/80 text-[10px] font-medium select-none">Outgoing Call</span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 relative">
            <Phone className="w-5 h-5 text-emerald-400" />
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold truncate">
              #{callChannelName}
            </p>
            <p className="text-gray-400 text-xs">
              {callState === 'ringing-out' ? 'Ringing...' : 'Connecting...'}
            </p>
          </div>
        </div>

        <button
          onClick={leaveCall}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-xl text-xs font-medium transition-colors"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
});
OutgoingCallPopup.displayName = 'OutgoingCallPopup';

/* =====================================================
   FLOATING ACTIVE CALL WIDGET — compact top-right card
===================================================== */
export const ActiveCallWidget = memo(() => {
  const {
    callState,
    callChannelName,
    isMuted,
    isSpeaker,
    participants,
    callDuration,
    toggleMute,
    toggleSpeaker,
    leaveCall,
    endCall,
  } = useAudioCall();

  const formattedDuration = useMemo(() => formatDuration(callDuration), [callDuration]);
  const { dragRef, onPointerDown, onPointerMove, onPointerUp, style } = useDraggable();

  if (callState !== 'active') return null;

  return (
    <div
      data-draggable-popup
      className="fixed z-[60] w-72 bg-gray-900 rounded-2xl shadow-2xl shadow-black/40 border border-gray-700 overflow-hidden animate-slide-in"
      style={style}
    >
      {/* Drag handle + Green gradient header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 flex items-center gap-2">
        {/* Drag handle */}
        <div
          ref={dragRef}
          className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 text-white/60 hover:text-white/90 transition-colors"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <GripHorizontal className="w-4 h-4" />
        </div>
        {/* Sound wave */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <div className="w-0.5 h-2.5 bg-white/80 rounded-full animate-sound-wave-1" />
          <div className="w-0.5 h-3.5 bg-white/80 rounded-full animate-sound-wave-2" />
          <div className="w-0.5 h-2 bg-white/80 rounded-full animate-sound-wave-3" />
        </div>
        <span className="text-white text-xs font-semibold flex-1 truncate">
          #{callChannelName}
        </span>
        <span className="text-white/80 text-xs font-mono tabular-nums">
          {formattedDuration}
        </span>
      </div>

      <div className="p-3">
        {/* Participant list */}
        <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
          {participants.map((p) => (
            <div
              key={p.identity}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800/60"
            >
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-gray-300">
                  {(p.name || '?')[0].toUpperCase()}
                </span>
              </div>
              <span className="text-gray-200 text-xs flex-1 truncate">{p.name}</span>
              {p.isLocal && (
                <span className="text-[9px] text-gray-500 bg-gray-800 px-1 py-0.5 rounded">You</span>
              )}
              {p.isMuted ? (
                <MicOff className="w-3 h-3 text-red-400 flex-shrink-0" />
              ) : (
                <div className="flex items-center gap-px flex-shrink-0">
                  <div className="w-0.5 h-1.5 bg-green-400 rounded-full animate-sound-wave-1" />
                  <div className="w-0.5 h-2.5 bg-green-400 rounded-full animate-sound-wave-2" />
                  <div className="w-0.5 h-1 bg-green-400 rounded-full animate-sound-wave-3" />
                </div>
              )}
            </div>
          ))}
          {participants.filter((p) => !p.isLocal).length === 0 && (
            <p className="text-gray-500 text-[11px] text-center py-1">Waiting for others...</p>
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-xl transition-colors ${
              isMuted
                ? 'bg-white/10 text-red-400 hover:bg-white/15'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleSpeaker}
            className={`p-2 rounded-xl transition-colors ${
              isSpeaker
                ? 'bg-white/10 text-white hover:bg-white/15'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
            title={isSpeaker ? 'Earpiece' : 'Speaker'}
          >
            {isSpeaker ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={leaveCall}
            className="p-2 rounded-xl transition-colors bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25"
            title="Leave call"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={endCall}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors flex items-center gap-1.5"
            title="End call for everyone"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="text-xs font-medium">End</span>
          </button>
        </div>
      </div>
    </div>
  );
});
ActiveCallWidget.displayName = 'ActiveCallWidget';

/* =====================================================
   REJOIN CALL POPUP — shown after the user leaves a
   call that is still ongoing in that channel.
===================================================== */
export const RejoinCallPopup = memo(() => {
  const { callState, lastLeftChannel, activeCallChannels, joinCall, dismissRejoin } = useAudioCall();
  const { dragRef, onPointerDown, onPointerMove, onPointerUp, style } = useDraggable();

  // Only show when idle AND the channel the user left is still active
  const channelStillActive =
    lastLeftChannel && !!activeCallChannels[lastLeftChannel.channelId];

  if (callState !== 'idle' || !channelStillActive) return null;

  const handleRejoin = () => {
    joinCall(lastLeftChannel.channelId, lastLeftChannel.channelName);
  };

  return (
    <div
      data-draggable-popup
      className="fixed z-[60] w-72 bg-gray-900 rounded-2xl shadow-2xl shadow-black/40 border border-gray-700 overflow-hidden animate-slide-in"
      style={style}
    >
      {/* Drag handle bar */}
      <div className="h-7 bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center px-3 gap-2">
        <div
          ref={dragRef}
          className="cursor-grab active:cursor-grabbing touch-none text-white/70 hover:text-white transition-colors"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <GripHorizontal className="w-4 h-4" />
        </div>
        <span className="text-white/80 text-[10px] font-medium select-none">Call still active</span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold truncate">
              #{lastLeftChannel.channelName || 'channel'}
            </p>
            <p className="text-gray-400 text-xs">You left — call is still going</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={dismissRejoin}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-xs font-medium transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleRejoin}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl text-xs font-medium transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            Rejoin
          </button>
        </div>
      </div>
    </div>
  );
});
RejoinCallPopup.displayName = 'RejoinCallPopup';

/* =====================================================
   ACTIVE CALL BAR — Inline banner within the channel
   when there's an ongoing call (for non-participants
   or the participant's inline indicator).
===================================================== */
export const ActiveCallBar = memo(({ channelId, channelName }) => {
  const { callState, callChannelId, activeCallChannels, joinCall, participants, callDuration } = useAudioCall();

  const formattedDuration = useMemo(() => formatDuration(callDuration), [callDuration]);

  const isInThisCall = callState === 'active' && callChannelId === channelId;
  const hasActiveCall = !!activeCallChannels[channelId];

  if (!isInThisCall && !hasActiveCall) return null;

  if (isInThisCall) {
    return (
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-green-500/20 text-green-600 dark:text-green-400 px-4 py-2 flex items-center gap-3">
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <div className="w-0.5 h-3 bg-green-500 rounded-full animate-sound-wave-1" />
          <div className="w-0.5 h-4 bg-green-500 rounded-full animate-sound-wave-2" />
          <div className="w-0.5 h-2 bg-green-500 rounded-full animate-sound-wave-3" />
          <div className="w-0.5 h-3.5 bg-green-500 rounded-full animate-sound-wave-1" />
        </div>
        <span className="text-xs font-semibold flex-1">
          In Call · {formattedDuration} · {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
        </span>
      </div>
    );
  }

  // Not in call — show join banner for ongoing call in this channel
  const callInfo = activeCallChannels[channelId];
  return (
    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-green-500/20 px-4 py-2 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
        <Phone className="w-4 h-4 text-green-500 animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-green-700 dark:text-green-400 text-xs font-semibold">
          Ongoing voice call
        </p>
        {callInfo?.callerName && (
          <p className="text-green-600/70 dark:text-green-400/60 text-[11px]">
            Started by {callInfo.callerName}
          </p>
        )}
      </div>
      <button
        onClick={() => joinCall(channelId, channelName)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
      >
        <Phone className="w-3 h-3" />
        Join
      </button>
    </div>
  );
});
ActiveCallBar.displayName = 'ActiveCallBar';

/* =====================================================
   CALL SYSTEM MESSAGE — rendered inside the chat log
   Shows call start/end events with a "Join" button.
===================================================== */
export const CallSystemMessage = memo(({ message, channelId, channelName }) => {
  const { activeCallChannels, joinCall, callState, callChannelId } = useAudioCall();

  const isOngoing = !!activeCallChannels[channelId];
  const isInThisCall = callState === 'active' && callChannelId === channelId;
  const isCallStart = message.callType === 'start';
  const isCallEnd = message.callType === 'end';

  return (
    <div className="flex justify-center my-3">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full max-w-sm">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          isCallStart
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-gray-200 dark:bg-gray-700'
        }`}>
          {isCallStart ? (
            <Phone className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          ) : (
            <PhoneOff className="w-3.5 h-3.5 text-gray-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {isCallStart ? (
              <><span className="font-semibold">{message.callerName}</span> started a voice call</>
            ) : (
              <>Voice call ended{message.duration ? ` · ${formatDuration(message.duration)}` : ''}</>
            )}
          </p>
        </div>
        {/* Join button — only when call is active and user not already in it */}
        {isCallStart && isOngoing && !isInThisCall && (
          <button
            onClick={() => joinCall(channelId, channelName)}
            className="flex items-center gap-1 px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[11px] font-medium transition-colors flex-shrink-0"
          >
            <Phone className="w-3 h-3" />
            Join
          </button>
        )}
        {isCallStart && isInThisCall && (
          <span className="text-[11px] text-green-600 dark:text-green-400 font-medium flex-shrink-0 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            In call
          </span>
        )}
      </div>
    </div>
  );
});
CallSystemMessage.displayName = 'CallSystemMessage';

/* =====================================================
   CALL OVERLAY — Renders the floating call popups.
   Mount once at page level (outside chat area).
===================================================== */
export const CallOverlay = memo(() => {
  return (
    <>
      <IncomingCallPopup />
      <OutgoingCallPopup />
      <ActiveCallWidget />
      <RejoinCallPopup />
    </>
  );
});
CallOverlay.displayName = 'CallOverlay';
