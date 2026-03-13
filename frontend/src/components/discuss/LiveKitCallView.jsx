/**
 * LiveKitCallView.jsx
 * Discord-style voice/video call panel powered by LiveKit.
 *
 * Features:
 *  - Voice + Video calling in a Discord-like dark panel
 *  - Adaptive participant grid (mirrors Discord's layout)
 *  - Per-participant speaking indicators (green ring)
 *  - Mute mic, toggle camera, screen share
 *  - Minimized floating pill when panel is hidden
 *  - Incoming call notification toast
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  LocalParticipant,
} from 'livekit-client';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Phone, ChevronDown, ChevronUp,
  Users, Loader2, WifiOff,
} from 'lucide-react';

/* =====================================================
   PARTICIPANT TILE
   Renders video track or avatar for one participant
===================================================== */
const ParticipantTile = memo(({ participant, isLocal, isSpeaking }) => {
  const videoRef = useRef(null);
  const [hasCam, setHasCam] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (!participant) return;

    const updateState = () => {
      const camPub = participant.getTrackPublication(Track.Source.Camera);
      const micPub = participant.getTrackPublication(Track.Source.Microphone);
      const camOn = !!(camPub && camPub.track && !camPub.isMuted);
      setHasCam(camOn);
      setIsMuted(!micPub || micPub.isMuted);

      // Attach/detach video
      if (videoRef.current) {
        if (camOn && camPub.track) {
          camPub.track.attach(videoRef.current);
        } else {
          // detach all tracks from the element
          videoRef.current.srcObject = null;
        }
      }
    };

    updateState();
    participant.on('trackPublished', updateState);
    participant.on('trackUnpublished', updateState);
    participant.on('trackMuted', updateState);
    participant.on('trackUnmuted', updateState);
    participant.on('trackSubscribed', updateState);

    return () => {
      participant.off('trackPublished', updateState);
      participant.off('trackUnpublished', updateState);
      participant.off('trackMuted', updateState);
      participant.off('trackUnmuted', updateState);
      participant.off('trackSubscribed', updateState);
    };
  }, [participant]);

  const displayName = participant?.name || participant?.identity || 'Unknown';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-[#1e1f22] border-2 transition-all duration-200 min-h-[130px] ${
        isSpeaking
          ? 'border-green-400 shadow-[0_0_0_3px_rgba(74,222,128,0.35)]'
          : 'border-[#2b2d31]'
      }`}
    >
      {/* Video element (hidden when no cam) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${hasCam ? 'block' : 'hidden'}`}
      />

      {/* Avatar fallback */}
      {!hasCam && (
        <div className="flex flex-col items-center justify-center w-full h-full gap-2 py-6">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg ${
              isSpeaking
                ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                : 'bg-gradient-to-br from-indigo-500 to-purple-600'
            }`}
          >
            {initial}
          </div>
        </div>
      )}

      {/* Name + mute bar */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1">
        <span className="text-white text-xs font-semibold bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full truncate max-w-[80%]">
          {displayName}
          {isLocal && ' (You)'}
        </span>
        <span
          className={`flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 ${
            isMuted ? 'bg-red-500/90' : isSpeaking ? 'bg-green-500/90' : 'bg-black/50'
          }`}
        >
          {isMuted ? (
            <MicOff className="w-2.5 h-2.5 text-white" />
          ) : (
            <Mic className="w-2.5 h-2.5 text-white" />
          )}
        </span>
      </div>

      {/* Speaking pulse ring */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-2xl border-2 border-green-400 animate-pulse pointer-events-none" />
      )}
    </div>
  );
});
ParticipantTile.displayName = 'ParticipantTile';

/* =====================================================
   REMOTE AUDIO — attaches audio tracks for remote peers
   (local audio is NOT attached to avoid echo)
===================================================== */
const RemoteAudio = memo(({ participant }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!participant) return;

    const attach = () => {
      const micPub = participant.getTrackPublication(Track.Source.Microphone);
      if (micPub?.track && audioRef.current) {
        micPub.track.attach(audioRef.current);
      }
    };

    attach();
    participant.on('trackSubscribed', attach);
    participant.on('trackUnpublished', attach);

    return () => {
      participant.off('trackSubscribed', attach);
      participant.off('trackUnpublished', attach);
    };
  }, [participant]);

  return <audio ref={audioRef} autoPlay playsInline />;
});
RemoteAudio.displayName = 'RemoteAudio';

/* =====================================================
   INCOMING CALL BANNER
   Toast shown to non-callers when a call is started
===================================================== */
export const IncomingCallBanner = memo(({ callInfo, onJoin, onDismiss }) => {
  useEffect(() => {
    // Auto-dismiss after 30 seconds
    const t = setTimeout(() => onDismiss?.(), 30000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right-4 duration-300">
      <div className="bg-[#232428] border border-[#3d3f45] rounded-2xl shadow-2xl p-4 w-80 flex items-center gap-3">
        {/* Ringing animation */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div className="absolute inset-0 rounded-full bg-green-500 opacity-30 animate-ping" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {callInfo.callerName}
          </p>
          <p className="text-gray-400 text-xs truncate">
            Calling in #{callInfo.channelName || callInfo.channelId}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onJoin}
            className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
            title="Join call"
          >
            <Phone className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={onDismiss}
            className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors"
            title="Decline"
          >
            <PhoneOff className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
});
IncomingCallBanner.displayName = 'IncomingCallBanner';

/* =====================================================
   MAIN LIVEKIT CALL VIEW
   Discord-style call panel — renders alongside the chat
===================================================== */
const LiveKitCallView = ({
  livekitUrl,
  token,
  roomName,
  channelName,
  onLeave,
}) => {
  const roomRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState(null);

  // Controls
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);

  // Participants
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [localParticipant, setLocalParticipant] = useState(null);
  const [speakingIds, setSpeakingIds] = useState(new Set());

  // UI
  const [minimized, setMinimized] = useState(false);

  /* --------------------------------------------------
     CONNECT TO ROOM
  -------------------------------------------------- */
  useEffect(() => {
    if (!token || !livekitUrl || !roomName) return;

    let isCancelled = false;

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    roomRef.current = room;

    const refresh = () => {
      if (isCancelled) return;
      setRemoteParticipants([...room.remoteParticipants.values()]);
      setLocalParticipant(room.localParticipant);
    };

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      if (isCancelled) return;
      setSpeakingIds(new Set(speakers.map((s) => s.identity)));
    });

    room.on(RoomEvent.ParticipantConnected, refresh);
    room.on(RoomEvent.ParticipantDisconnected, refresh);
    room.on(RoomEvent.TrackPublished, refresh);
    room.on(RoomEvent.TrackUnpublished, refresh);
    room.on(RoomEvent.TrackSubscribed, refresh);
    room.on(RoomEvent.TrackUnsubscribed, refresh);
    room.on(RoomEvent.LocalTrackPublished, refresh);
    room.on(RoomEvent.LocalTrackUnpublished, refresh);
    room.on(RoomEvent.Disconnected, () => {
      if (!isCancelled) setConnected(false);
    });

    const connect = async () => {
      try {
        setConnecting(true);
        setError(null);
        await room.connect(livekitUrl, token, { autoSubscribe: true });
        if (isCancelled) return;
        await room.localParticipant.setMicrophoneEnabled(true);
        if (isCancelled) return;
        setMicEnabled(true);
        refresh();
        setConnected(true);
      } catch (err) {
        if (isCancelled) return;
        console.error('LiveKit connect failed:', err);
        setError(err.message || 'Failed to connect');
      } finally {
        if (!isCancelled) setConnecting(false);
      }
    };

    connect();

    return () => {
      isCancelled = true;
      room.disconnect();
      roomRef.current = null;
    };
  }, [token, livekitUrl, roomName]);

  /* --------------------------------------------------
     CONTROLS
  -------------------------------------------------- */
  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    const next = !micEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  }, [micEnabled]);

  const toggleCam = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    const next = !camEnabled;
    await room.localParticipant.setCameraEnabled(next);
    setCamEnabled(next);
  }, [camEnabled]);

  const toggleScreen = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    try {
      await room.localParticipant.setScreenShareEnabled(!screenSharing);
      setScreenSharing((v) => !v);
    } catch (err) {
      console.error('Screen share error:', err);
    }
  }, [screenSharing]);

  const leaveCall = useCallback(() => {
    roomRef.current?.disconnect();
    onLeave?.();
  }, [onLeave]);

  /* --------------------------------------------------
     PARTICIPANT LIST
  -------------------------------------------------- */
  const allParticipants = localParticipant
    ? [localParticipant, ...remoteParticipants]
    : remoteParticipants;

  const n = allParticipants.length;
  const gridCols =
    n <= 1 ? 'grid-cols-1' :
    n <= 2 ? 'grid-cols-2' :
    n <= 4 ? 'grid-cols-2' :
    n <= 6 ? 'grid-cols-3' : 'grid-cols-4';

  /* --------------------------------------------------
     MINIMIZED PILL
  -------------------------------------------------- */
  if (minimized) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 bg-[#1a1b1e] border border-[#3d3f45] rounded-full px-4 py-2.5 shadow-2xl">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
              }`}
            />
            <span className="text-white text-sm font-semibold">
              #{channelName}
            </span>
          </div>
          <span className="text-gray-400 text-xs">{n} in call</span>
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={toggleMic}
              className={`p-1.5 rounded-full transition-colors ${
                micEnabled ? 'hover:bg-white/10 text-gray-300' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setMinimized(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={leaveCall}
              className="p-1.5 rounded-full bg-red-500 hover:bg-red-400 text-white transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------
     FULL CALL PANEL
  -------------------------------------------------- */
  return (
    <div className="flex flex-col h-full bg-[#1e1f22] overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b2d31] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              connected
                ? 'bg-green-400 animate-pulse'
                : connecting
                ? 'bg-yellow-400 animate-ping'
                : 'bg-red-400'
            }`}
          />
          <span className="text-white font-semibold text-sm">
            #{channelName}
          </span>
          <span className="text-gray-500 text-xs">
            {connected
              ? `${n} participant${n !== 1 ? 's' : ''}`
              : connecting
              ? 'Connecting…'
              : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
          title="Minimize"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-6">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
            <WifiOff className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white font-semibold">Failed to join call</p>
          <p className="text-gray-400 text-sm text-center max-w-xs">{error}</p>
          <button
            onClick={leaveCall}
            className="mt-2 px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Connecting state */}
      {!error && connecting && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          <p className="text-white font-semibold">Joining call…</p>
          <p className="text-gray-400 text-sm">Connecting to #{channelName}</p>
        </div>
      )}

      {/* Participant grid */}
      {!error && connected && (
        <div className="flex-1 overflow-y-auto p-3">
          {/* Audio elements for remote participants */}
          {remoteParticipants.map((p) => (
            <RemoteAudio key={p.identity} participant={p} />
          ))}

          {n === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 py-12">
              <Users className="w-16 h-16 opacity-20" />
              <p className="font-medium text-sm">Waiting for others to join…</p>
              <p className="text-xs opacity-60">Invite teammates to this channel</p>
            </div>
          ) : (
            <div className={`grid ${gridCols} gap-2`}>
              {allParticipants.map((p) => {
                const isLocal =
                  p instanceof LocalParticipant ||
                  (localParticipant && p.identity === localParticipant.identity);
                return (
                  <ParticipantTile
                    key={p.identity}
                    participant={p}
                    isLocal={!!isLocal}
                    isSpeaking={speakingIds.has(p.identity)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Control bar */}
      {!error && (
        <div className="flex-shrink-0 border-t border-[#2b2d31] px-4 py-3 bg-[#1a1b1e]">
          <div className="flex items-center justify-center gap-3">
            {/* Mic toggle */}
            <ControlBtn
              onClick={toggleMic}
              disabled={!connected}
              active={!micEnabled}
              activeClass="bg-red-500 hover:bg-red-400"
              inactiveClass="bg-[#4e505a] hover:bg-[#5c5f6a]"
              label={micEnabled ? 'Mute' : 'Unmute'}
            >
              {micEnabled ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
            </ControlBtn>

            {/* Camera toggle */}
            <ControlBtn
              onClick={toggleCam}
              disabled={!connected}
              active={camEnabled}
              activeClass="bg-indigo-500 hover:bg-indigo-400"
              inactiveClass="bg-[#4e505a] hover:bg-[#5c5f6a]"
              label={camEnabled ? 'Stop Video' : 'Video'}
            >
              {camEnabled ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-gray-300" />}
            </ControlBtn>

            {/* Screen share */}
            <ControlBtn
              onClick={toggleScreen}
              disabled={!connected}
              active={screenSharing}
              activeClass="bg-green-500 hover:bg-green-400"
              inactiveClass="bg-[#4e505a] hover:bg-[#5c5f6a]"
              label={screenSharing ? 'Stop Share' : 'Screen'}
            >
              {screenSharing
                ? <MonitorOff className="w-5 h-5 text-white" />
                : <Monitor className="w-5 h-5 text-gray-300" />}
            </ControlBtn>

            {/* Leave */}
            <ControlBtn
              onClick={leaveCall}
              active
              activeClass="bg-red-500 hover:bg-red-400"
              inactiveClass="bg-red-500 hover:bg-red-400"
              label="Leave"
              labelClass="text-red-400"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </ControlBtn>
          </div>
        </div>
      )}
    </div>
  );
};

/* Small helper so the control bar buttons are DRY */
const ControlBtn = ({
  onClick,
  disabled,
  active,
  activeClass,
  inactiveClass,
  label,
  labelClass = 'text-gray-400',
  children,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="group flex flex-col items-center gap-1 focus:outline-none disabled:opacity-40"
  >
    <div
      className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
        active ? activeClass : inactiveClass
      }`}
    >
      {children}
    </div>
    <span className={`text-[10px] group-hover:opacity-100 opacity-70 transition-opacity ${labelClass}`}>
      {label}
    </span>
  </button>
);

export default LiveKitCallView;
