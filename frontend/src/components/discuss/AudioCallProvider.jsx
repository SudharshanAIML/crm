import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import * as discussService from '../../services/discussService';
import { useSocket, useSocketEvent } from '../../context/SocketContext';

// ---- Microphone permission helper ----
const requestMicPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the tracks immediately — we just needed the permission grant
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
};

// ---- Ringtone generator using Web Audio API ----
const createRingtone = () => {
  let ctx = null;
  let intervalId = null;

  const playTone = () => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);

    // Second tone after a short delay for a "ring-ring" pattern  
    setTimeout(() => {
      if (!ctx) return;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 523;
      gain2.gain.setValueAtTime(0.15, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.3);
    }, 200);
  };

  return {
    start() {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        playTone();
        intervalId = setInterval(playTone, 2500);
      } catch { /* silently fail if Web Audio unavailable */ }
    },
    stop() {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    },
  };
};

/**
 * AudioCallContext — WhatsApp-style audio calling for Discuss channels.
 *
 * Call states:
 *   idle        → No call active
 *   ringing-out → Outgoing: user initiated call, waiting for others to join
 *   ringing-in  → Incoming: someone else started a call in a channel
 *   connecting  → Connecting to LiveKit room
 *   active      → In an active call
 *
 * Also tracks which channels currently have active calls so that
 * non-participants can see the "ongoing call" banner and join mid-call.
 */

const AudioCallContext = createContext(null);

export const AudioCallProvider = ({ children }) => {
  const { emit } = useSocket();

  // Call state
  const [callState, setCallState] = useState('idle');
  const [callChannelId, setCallChannelId] = useState(null);
  const [callChannelName, setCallChannelName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callError, setCallError] = useState(null); // user-visible error message
  // Stores the last channel the user manually left (so they can rejoin)
  const [lastLeftChannel, setLastLeftChannel] = useState(null);

  // Track channels with ongoing calls (Map<channelId, { callerName, callerEmpId, startedAt }>)
  const [activeCallChannels, setActiveCallChannels] = useState({});

  // Refs
  const roomRef = useRef(null);
  const durationTimerRef = useRef(null);
  const ringingTimerRef = useRef(null);
  const disconnectingRef = useRef(false); // guard against recursive disconnect
  const ringtoneRef = useRef(null);
  // Keep a ref mirror of callChannelId so callbacks/timers always read the latest value
  const callChannelIdRef = useRef(null);
  useEffect(() => { callChannelIdRef.current = callChannelId; }, [callChannelId]);

  useEffect(() => {
    return () => {
      disconnectingRef.current = true;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (ringingTimerRef.current) clearTimeout(ringingTimerRef.current);
      if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
    };
  }, []);

  const syncParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const parts = [];
    const local = room.localParticipant;
    if (local) {
      parts.push({
        identity: local.identity,
        name: local.name || local.identity,
        isLocal: true,
        isMuted: !local.isMicrophoneEnabled,
      });
    }
    room.remoteParticipants.forEach((p) => {
      parts.push({
        identity: p.identity,
        name: p.name || p.identity,
        isLocal: false,
        isMuted: !p.isMicrophoneEnabled,
      });
    });
    setParticipants(parts);
  }, []);

  /**
   * Reset only local UI state — does NOT disconnect the room or emit socket events.
   */
  const resetLocalState = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (ringingTimerRef.current) {
      clearTimeout(ringingTimerRef.current);
      ringingTimerRef.current = null;
    }
    // Remove all attached LiveKit audio elements
    const audioContainer = document.getElementById('livekit-audio-container');
    if (audioContainer) audioContainer.innerHTML = '';
    // Stop any ringing sound
    if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
    roomRef.current = null;
    setCallState('idle');
    setCallChannelId(null);
    setCallChannelName('');
    setParticipants([]);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeaker(false);
    setIncomingCall(null);
  }, []);

  const connectToRoom = useCallback(async (channelId) => {
    try {
      setCallState('connecting');
      setCallError(null);

      // 1. Request microphone permission first — fail early with a clear message
      const micAllowed = await requestMicPermission();
      if (!micAllowed) {
        setCallError('Microphone access denied. Please allow microphone permission and try again.');
        console.warn('[Call] Microphone permission denied');
        resetLocalState();
        return false;
      }

      // 2. Fetch a LiveKit token from the backend
      let token, wsUrl;
      try {
        ({ token, wsUrl } = await discussService.getCallToken(channelId));
      } catch (fetchErr) {
        const msg = fetchErr?.response?.data?.message || fetchErr.message || 'Unknown error';
        setCallError(`Failed to get call token: ${msg}`);
        console.error('[Call] Token fetch failed:', fetchErr);
        resetLocalState();
        return false;
      }

      // 3. Create the LiveKit room instance (audio-only — no video features)
      const room = new Room({
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      room.on(RoomEvent.ParticipantConnected, (p) => {
        console.debug('[Call] ParticipantConnected:', p.identity);
        syncParticipants();
      });
      room.on(RoomEvent.ParticipantDisconnected, (p) => {
        console.debug('[Call] ParticipantDisconnected:', p.identity);
        syncParticipants();
      });
      room.on(RoomEvent.TrackMuted, () => syncParticipants());
      room.on(RoomEvent.TrackUnmuted, () => syncParticipants());

      // Attach remote audio tracks so they actually play through speakers
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.debug('[Call] TrackSubscribed:', track.kind, track.sid, 'from', participant?.identity);
        if (track.kind === 'audio') {
          const audio = track.attach();
          audio.autoplay = true;
          audio.volume = 1.0;
          audio.dataset.livekitTrack = track.sid;
          // Use off-screen positioning instead of display:none — some browsers
          // throttle or suspend media elements inside display:none containers.
          let container = document.getElementById('livekit-audio-container');
          if (!container) {
            container = document.createElement('div');
            container.id = 'livekit-audio-container';
            container.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:-9999px';
            document.body.appendChild(container);
          }
          container.appendChild(audio);
          audio.play().then(() => {
            console.debug('[Call] Audio playing for track', track.sid);
          }).catch((err) => {
            console.warn('[Call] Audio autoplay blocked, will retry on user interaction:', err.message);
            const resumePlay = () => {
              audio.play().catch(() => {});
            };
            document.addEventListener('click', resumePlay, { once: true });
          });
          track.on('ended', () => audio.remove());
        }
      });

      // Detach audio elements when remote tracks are unsubscribed
      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.debug('[Call] TrackUnsubscribed:', track.kind, track.sid, 'from', participant?.identity);
        if (track.kind === 'audio') {
          track.detach().forEach((el) => el.remove());
        }
      });

      // Track subscription failures
      room.on(RoomEvent.TrackSubscriptionFailed, (trackSid, participant, reason) => {
        console.error('[Call] TrackSubscriptionFailed:', trackSid, participant?.identity, reason);
      });

      room.on(RoomEvent.Disconnected, () => {
        // Only clean up if we didn't initiate the disconnect ourselves
        if (!disconnectingRef.current) {
          resetLocalState();
        }
      });

      // 4. Connect to LiveKit Cloud
      try {
        await room.connect(wsUrl, token);
      } catch (connErr) {
        setCallError('Failed to connect to call server. Check your internet connection.');
        console.error('[Call] LiveKit connect failed:', connErr);
        resetLocalState();
        return false;
      }

      // 5. Unlock browser audio context (needed for remote audio playback)
      try {
        await room.startAudio();
        console.debug('[Call] room.startAudio() succeeded');
      } catch (audioErr) {
        console.warn('[Call] room.startAudio() failed — remote audio may not play until user interacts:', audioErr);
      }

      // 6. Enable local microphone so others can hear us
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        console.debug('[Call] Microphone enabled, publishing:', room.localParticipant.audioTrackPublications.size, 'audio track(s)');
      } catch (micErr) {
        console.warn('[Call] Could not enable microphone after connect:', micErr);
        // Continue anyway — user can unmute later
      }

      roomRef.current = room;
      disconnectingRef.current = false;
      // Stop ringing once connected
      if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
      setCallState('active');
      setCallDuration(0);
      syncParticipants();

      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err) {
      console.error('[Call] Unexpected error in connectToRoom:', err);
      setCallError('Call failed unexpectedly. Please try again.');
      resetLocalState();
      return false;
    }
  }, [syncParticipants, resetLocalState]);

  /**
   * Start a new outgoing call
   */
  const startCall = useCallback(async (channelId, channelName, callerName) => {
    if (callState !== 'idle') return false;

    // Clear any pending rejoin prompt and previous errors
    setLastLeftChannel(null);
    setCallError(null);

    setCallState('ringing-out');
    setCallChannelId(channelId);
    setCallChannelName(channelName || `Channel ${channelId}`);

    // Play ringing tone
    ringtoneRef.current = createRingtone();
    ringtoneRef.current.start();

    // Signal other channel members
    emit('call:start', { channelId, callerName, channelName });

    // Mark this channel as having an active call (for our own UI too)
    setActiveCallChannels((prev) => ({
      ...prev,
      [channelId]: { callerName, startedAt: Date.now() },
    }));

    const success = await connectToRoom(channelId);
    if (!success) {
      // Connection failed — notify others so they don't see a phantom call
      emit('call:end', { channelId });
      setActiveCallChannels((prev) => {
        const next = { ...prev };
        delete next[channelId];
        return next;
      });
      resetLocalState();
      return false;
    }

    // Auto-end after 60s if nobody joins — mark as missed in DB
    ringingTimerRef.current = setTimeout(() => {
      const cid = callChannelIdRef.current;
      if (roomRef.current && roomRef.current.remoteParticipants.size === 0 && cid) {
        emit('call:missed', { channelId: cid });
        // Inline end-call logic — we're the last (only) participant
        disconnectingRef.current = true;
        roomRef.current.disconnect();
        roomRef.current = null;
        emit('call:end', { channelId: cid });
        setActiveCallChannels((prev) => {
          const next = { ...prev };
          delete next[cid];
          return next;
        });
        resetLocalState();
        disconnectingRef.current = false;
      }
    }, 60000);

    return true;
  }, [callState, connectToRoom, emit, resetLocalState]);

  /**
   * Accept an incoming call
   */
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return false;

    // Stop ringing
    if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }

    const { channelId, channelName } = incomingCall;
    setCallChannelId(channelId);
    setCallChannelName(channelName || `Channel ${channelId}`);
    setIncomingCall(null);

    const success = await connectToRoom(channelId);
    if (!success) {
      resetLocalState();
      return false;
    }
    return true;
  }, [incomingCall, connectToRoom, resetLocalState]);

  /**
   * Join an ongoing call in a channel (mid-call join from chat log)
   */
  const joinCall = useCallback(async (channelId, channelName) => {
    if (callState !== 'idle') return false;

    // Clear any pending rejoin prompt
    setLastLeftChannel(null);

    setCallChannelId(channelId);
    setCallChannelName(channelName || `Channel ${channelId}`);

    const success = await connectToRoom(channelId);
    if (!success) {
      resetLocalState();
      return false;
    }
    return true;
  }, [callState, connectToRoom, resetLocalState]);

  /**
   * Reject an incoming call
   */
  const rejectCall = useCallback(() => {
    // Stop ringing
    if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
    if (incomingCall) {
      emit('call:reject', { channelId: incomingCall.channelId });
    }
    setIncomingCall(null);
    setCallState('idle');
  }, [incomingCall, emit]);

  /**
   * Leave the current call (user steps out — call continues for others).
   * Saves the channel so the user can rejoin from the floating popup.
   */
  const leaveCall = useCallback(() => {
    const channelId = callChannelId;
    const channelName = callChannelName;

    disconnectingRef.current = true;

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    // Remember last left channel for the rejoin popup
    if (channelId) {
      setLastLeftChannel({ channelId, channelName });
    }

    resetLocalState();
    disconnectingRef.current = false;
  }, [callChannelId, callChannelName, resetLocalState]);

  /**
   * End the call — if other participants are still connected, just leave
   * gracefully (preserving the call for them) and show the rejoin popup.
   * Only truly terminate the call (emit call:end) when you're the last one.
   */
  const endCall = useCallback(() => {
    const channelId = callChannelId;
    const channelName = callChannelName;
    const hasOthers = roomRef.current?.remoteParticipants?.size > 0;

    disconnectingRef.current = true;

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (channelId) {
      if (hasOthers) {
        // Others still in the call — leave silently, offer rejoin
        setLastLeftChannel({ channelId, channelName });
      } else {
        // Last participant — end the call for real
        emit('call:end', { channelId });
        setActiveCallChannels((prev) => {
          const next = { ...prev };
          delete next[channelId];
          return next;
        });
      }
    }

    resetLocalState();
    disconnectingRef.current = false;
  }, [callChannelId, callChannelName, emit, resetLocalState]);

  /**
   * Dismiss the rejoin prompt without rejoining.
   */
  const dismissRejoin = useCallback(() => {
    setLastLeftChannel(null);
  }, []);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const newMuted = !isMuted;
    await room.localParticipant.setMicrophoneEnabled(!newMuted);
    setIsMuted(newMuted);
    syncParticipants();
  }, [isMuted, syncParticipants]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => !prev);
  }, []);

  /**
   * Handle incoming call:start from socket
   */
  const handleIncomingCall = useCallback((data) => {
    // Track this channel as having an active call
    setActiveCallChannels((prev) => ({
      ...prev,
      [data.channelId]: {
        callerName: data.callerName || 'Someone',
        callerEmpId: data.callerEmpId,
        channelName: data.channelName || '',
        startedAt: Date.now(),
      },
    }));

    // Don't show ringing popup if already in a call
    if (callState !== 'idle') return;

    setCallState('ringing-in');
    setIncomingCall({
      channelId: data.channelId,
      channelName: data.channelName || '',
      callerName: data.callerName || 'Someone',
      callerEmpId: data.callerEmpId,
    });

    // Play ringtone for incoming call
    ringtoneRef.current = createRingtone();
    ringtoneRef.current.start();

    ringingTimerRef.current = setTimeout(() => {
      // Stop ringing on timeout
      if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
      setIncomingCall((prev) => {
        if (prev?.channelId === data.channelId) {
          setCallState('idle');
          return null;
        }
        return prev;
      });
    }, 30000);
  }, [callState]);

  /**
   * Handle call:end from socket
   */
  const handleCallEnded = useCallback((data) => {
    // Remove from active call channels
    setActiveCallChannels((prev) => {
      const next = { ...prev };
      delete next[data.channelId];
      return next;
    });

    // Clear the rejoin prompt if it pointed to this channel
    setLastLeftChannel((prev) =>
      prev?.channelId === data.channelId ? null : prev
    );

    // If we have an incoming call for this channel, dismiss it
    if (incomingCall?.channelId === data.channelId && callState === 'ringing-in') {
      resetLocalState();
      return;
    }

    // If we're in a call on this channel and we're the last one, clean up
    if (callChannelId === data.channelId && roomRef.current) {
      if (roomRef.current.remoteParticipants.size === 0) {
        disconnectingRef.current = true;
        roomRef.current.disconnect();
        roomRef.current = null;
        resetLocalState();
        disconnectingRef.current = false;
      }
    }
  }, [incomingCall, callState, callChannelId, resetLocalState]);

  useSocketEvent('call:start', handleIncomingCall);
  useSocketEvent('call:end', handleCallEnded);

  const clearCallError = useCallback(() => setCallError(null), []);

  const value = {
    // State
    callState,
    callChannelId,
    callChannelName,
    isMuted,
    isSpeaker,
    participants,
    callDuration,
    incomingCall,
    activeCallChannels,
    callError,

    // Actions
    startCall,
    acceptCall,
    rejectCall,
    joinCall,
    leaveCall,
    endCall,
    dismissRejoin,
    clearCallError,
    toggleMute,
    toggleSpeaker,
    // Rejoin state
    lastLeftChannel,
  };

  return (
    <AudioCallContext.Provider value={value}>
      {children}
    </AudioCallContext.Provider>
  );
};

export const useAudioCall = () => {
  const ctx = useContext(AudioCallContext);
  if (!ctx) throw new Error('useAudioCall must be used within AudioCallProvider');
  return ctx;
};
