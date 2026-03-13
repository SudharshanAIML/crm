import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import * as audioCallService from '../../services/audioCallService';
import { useSocket, useSocketEvent } from '../../context/SocketContext';

const AudioCallContext = createContext(null);

export const AudioCallProvider = ({ children }) => {
  const { emit } = useSocket();

  // Call state
  const [callState, setCallState] = useState('idle');
  const [callChannelId, setCallChannelId] = useState(null);
  const [callChannelName, setCallChannelName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callError, setCallError] = useState(null);
  const [lastLeftChannel, setLastLeftChannel] = useState(null);
  const [activeCallChannels, setActiveCallChannels] = useState({});

  // Refs
  const roomRef = useRef(null);
  const durationTimerRef = useRef(null);
  const ringingTimerRef = useRef(null);
  const disconnectingRef = useRef(false);
  const ringtoneRef = useRef(null);
  const callChannelIdRef = useRef(null);
  const audioElementsRef = useRef(new Map()); // Track audio elements by track SID

  useEffect(() => {
    callChannelIdRef.current = callChannelId;
  }, [callChannelId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectingRef.current = true;
      cleanupCall();
    };
  }, []);

  /**
   * Sync participants list from room state
   */
  const syncParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const parts = [];
    
    // Add local participant
    const local = room.localParticipant;
    if (local) {
      parts.push({
        identity: local.identity,
        name: local.name || local.identity,
        isLocal: true,
        isMuted: !local.isMicrophoneEnabled,
        isSpeaking: false,
      });
    }

    // Add remote participants
    room.remoteParticipants.forEach((participant) => {
      parts.push({
        identity: participant.identity,
        name: participant.name || participant.identity,
        isLocal: false,
        isMuted: !participant.isMicrophoneEnabled,
        isSpeaking: false,
      });
    });

    setParticipants(parts);
  }, []);

  /**
   * Attach remote audio track to DOM for playback
   */
  const attachRemoteAudio = useCallback((track, participant) => {
    if (track.kind !== Track.Kind.Audio) return;

    console.log('[AudioCall] Attaching audio track:', track.sid, 'from', participant.identity);

    try {
      // Create audio element
      const audioElement = track.attach();
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      audioElement.volume = 1.0;
      audioElement.muted = false;
      audioElement.dataset.trackSid = track.sid;
      audioElement.dataset.participant = participant.identity;

      // Add to container
      const container = audioCallService.getAudioContainer();
      container.appendChild(audioElement);

      // Store reference
      audioElementsRef.current.set(track.sid, audioElement);

      // Attempt playback with retry logic
      const attemptPlay = async (retries = 3) => {
        try {
          await audioElement.play();
          console.log('[AudioCall] Audio playing successfully:', track.sid);
        } catch (error) {
          console.warn('[AudioCall] Autoplay failed:', error.message);
          
          if (retries > 0) {
            // Retry after short delay
            setTimeout(() => attemptPlay(retries - 1), 500);
          } else {
            // Wait for user interaction
            const resumePlay = () => {
              audioElement.play().catch(console.warn);
              document.removeEventListener('click', resumePlay);
              document.removeEventListener('touchstart', resumePlay);
              document.removeEventListener('keydown', resumePlay);
            };
            
            document.addEventListener('click', resumePlay, { once: true });
            document.addEventListener('touchstart', resumePlay, { once: true });
            document.addEventListener('keydown', resumePlay, { once: true });
          }
        }
      };

      attemptPlay();

      // Handle track ended
      track.on('ended', () => {
        console.log('[AudioCall] Track ended:', track.sid);
        detachRemoteAudio(track);
      });

    } catch (error) {
      console.error('[AudioCall] Failed to attach audio track:', error);
    }
  }, []);

  /**
   * Detach and remove audio element
   */
  const detachRemoteAudio = useCallback((track) => {
    const audioElement = audioElementsRef.current.get(track.sid);
    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
      audioElement.remove();
      audioElementsRef.current.delete(track.sid);
      console.log('[AudioCall] Detached audio track:', track.sid);
    }
  }, []);

  /**
   * Setup LiveKit room event handlers
   */
  const setupRoomHandlers = useCallback((room) => {
    // Participant events
    room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('[AudioCall] Participant connected:', participant.identity);
      syncParticipants();
      
      // Attach any existing audio tracks
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          attachRemoteAudio(publication.track, participant);
        }
      });
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('[AudioCall] Participant disconnected:', participant.identity);
      
      // Clean up audio tracks
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          detachRemoteAudio(publication.track);
        }
      });
      
      syncParticipants();
    });

    // Track events
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('[AudioCall] Track subscribed:', track.kind, track.sid, 'from', participant.identity);
      
      if (track.kind === Track.Kind.Audio) {
        attachRemoteAudio(track, participant);
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log('[AudioCall] Track unsubscribed:', track.kind, track.sid, 'from', participant.identity);
      
      if (track.kind === Track.Kind.Audio) {
        detachRemoteAudio(track);
      }
    });

    room.on(RoomEvent.TrackMuted, (publication, participant) => {
      console.log('[AudioCall] Track muted:', publication.trackSid, 'from', participant.identity);
      syncParticipants();
    });

    room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      console.log('[AudioCall] Track unmuted:', publication.trackSid, 'from', participant.identity);
      syncParticipants();
    });

    room.on(RoomEvent.TrackSubscriptionFailed, (trackSid, participant, reason) => {
      console.error('[AudioCall] Track subscription failed:', trackSid, participant?.identity, reason);
    });

    room.on(RoomEvent.TrackPublished, (publication, participant) => {
      console.log('[AudioCall] Track published:', publication.trackSid, 'from', participant.identity);
    });

    room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
      console.log('[AudioCall] Track unpublished:', publication.trackSid, 'from', participant.identity);
    });

    // Connection events
    room.on(RoomEvent.Reconnecting, () => {
      console.log('[AudioCall] Reconnecting...');
      setCallState('reconnecting');
    });

    room.on(RoomEvent.Reconnected, () => {
      console.log('[AudioCall] Reconnected');
      setCallState('active');
      syncParticipants();
    });

    room.on(RoomEvent.Disconnected, (reason) => {
      console.log('[AudioCall] Disconnected:', reason);
      
      if (!disconnectingRef.current) {
        // Unexpected disconnect
        setCallError('Call disconnected unexpectedly');
        resetLocalState();
      }
    });

    room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      console.log('[AudioCall] Connection quality:', quality, participant?.identity);
    });

    // Audio playback events
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      console.log('[AudioCall] Audio playback status changed');
    });

  }, [syncParticipants, attachRemoteAudio, detachRemoteAudio]);

  /**
   * Clean up all call resources
   */
  const cleanupCall = useCallback(() => {
    // Stop timers
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (ringingTimerRef.current) {
      clearTimeout(ringingTimerRef.current);
      ringingTimerRef.current = null;
    }

    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
      ringtoneRef.current = null;
    }

    // Clean up audio elements
    audioElementsRef.current.forEach((element) => {
      element.pause();
      element.srcObject = null;
      element.remove();
    });
    audioElementsRef.current.clear();
    audioCallService.clearAudioElements();

    // Disconnect room
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
  }, []);

  /**
   * Reset local UI state
   */
  const resetLocalState = useCallback(() => {
    cleanupCall();
    setCallState('idle');
    setCallChannelId(null);
    setCallChannelName('');
    setParticipants([]);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeaker(true);
    setIncomingCall(null);
  }, [cleanupCall]);

  /**
   * Connect to LiveKit room
   */
  const connectToRoom = useCallback(async (channelId) => {
    try {
      setCallState('connecting');
      setCallError(null);

      console.log('[AudioCall] Starting connection to channel:', channelId);

      // 1. Check browser support
      const browserCheck = audioCallService.checkBrowserSupport();
      if (!browserCheck.supported) {
        throw new Error(`Browser missing required features: ${browserCheck.missing.join(', ')}`);
      }

      // 2. Request microphone permission
      const micAllowed = await audioCallService.requestMicrophonePermission();
      if (!micAllowed) {
        setCallError('Microphone access denied. Please allow microphone permission and try again.');
        resetLocalState();
        return false;
      }

      console.log('[AudioCall] Microphone permission granted');

      // 3. Fetch LiveKit token
      let token, wsUrl, roomName;
      try {
        const tokenData = await audioCallService.getCallToken(channelId);
        token = tokenData.token;
        wsUrl = tokenData.wsUrl;
        roomName = tokenData.roomName;
        console.log('[AudioCall] Token received for room:', roomName);
      } catch (error) {
        setCallError(error.message || 'Failed to get call token');
        resetLocalState();
        return false;
      }

      // 4. Create LiveKit room with optimized audio settings
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
          channelCount: 1,
        },
        publishDefaults: {
          audioPreset: {
            maxBitrate: 64000,
          },
        },
      });

      // 5. Setup event handlers before connecting
      setupRoomHandlers(room);

      // 6. Connect to LiveKit server
      try {
        await room.connect(wsUrl, token);
        console.log('[AudioCall] Connected to room:', roomName);
      } catch (error) {
        console.error('[AudioCall] Connection failed:', error);
        setCallError('Failed to connect to call server. Check your internet connection.');
        resetLocalState();
        return false;
      }

      // 7. Start audio playback (unlock audio context)
      try {
        await room.startAudio();
        console.log('[AudioCall] Audio context started');
      } catch (error) {
        console.warn('[AudioCall] Failed to start audio context:', error);
        // Continue anyway - will retry on user interaction
      }

      // 8. Enable local microphone
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log('[AudioCall] Microphone enabled and publishing');
        
        // Verify track is publishing
        const audioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (audioTrack) {
          console.log('[AudioCall] Audio track published:', audioTrack.trackSid);
        } else {
          console.warn('[AudioCall] No audio track found after enabling microphone');
        }
      } catch (error) {
        console.error('[AudioCall] Failed to enable microphone:', error);
        setCallError('Failed to enable microphone. Please check your device settings.');
        room.disconnect();
        resetLocalState();
        return false;
      }

      // 9. Store room reference and update state
      roomRef.current = room;
      disconnectingRef.current = false;

      // Stop ringtone
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
        ringtoneRef.current = null;
      }

      setCallState('active');
      setCallDuration(0);
      syncParticipants();

      // Start duration timer
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      console.log('[AudioCall] Call active with', room.remoteParticipants.size, 'remote participants');

      return true;
    } catch (error) {
      console.error('[AudioCall] Unexpected error in connectToRoom:', error);
      setCallError(error.message || 'Call failed unexpectedly. Please try again.');
      resetLocalState();
      return false;
    }
  }, [setupRoomHandlers, syncParticipants, resetLocalState]);

  /**
   * Start a new outgoing call
   */
  const startCall = useCallback(async (channelId, channelName, callerName) => {
    if (callState !== 'idle') {
      console.warn('[AudioCall] Cannot start call - already in call state:', callState);
      return false;
    }

    console.log('[AudioCall] Starting call to channel:', channelId);

    setLastLeftChannel(null);
    setCallError(null);
    setCallState('ringing-out');
    setCallChannelId(channelId);
    setCallChannelName(channelName || `Channel ${channelId}`);

    // Play ringing tone
    ringtoneRef.current = audioCallService.createRingtone();
    ringtoneRef.current.start();

    // Notify other channel members
    emit('call:start', { channelId, callerName, channelName });

    // Mark channel as having active call
    setActiveCallChannels((prev) => ({
      ...prev,
      [channelId]: { callerName, startedAt: Date.now() },
    }));

    // Connect to room
    const success = await connectToRoom(channelId);
    
    if (!success) {
      // Connection failed - notify others
      emit('call:end', { channelId });
      setActiveCallChannels((prev) => {
        const next = { ...prev };
        delete next[channelId];
        return next;
      });
      resetLocalState();
      return false;
    }

    // Auto-end if nobody joins within 60 seconds
    ringingTimerRef.current = setTimeout(() => {
      const room = roomRef.current;
      const cid = callChannelIdRef.current;
      
      if (room && room.remoteParticipants.size === 0 && cid) {
        console.log('[AudioCall] Call timeout - no participants joined');
        emit('call:missed', { channelId: cid });
        endCall();
      }
    }, 60000);

    return true;
  }, [callState, connectToRoom, emit, resetLocalState]);

  /**
   * Accept incoming call
   */
  const acceptCall = useCallback(async () => {
    if (!incomingCall) {
      console.warn('[AudioCall] No incoming call to accept');
      return false;
    }

    console.log('[AudioCall] Accepting call from channel:', incomingCall.channelId);

    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
      ringtoneRef.current = null;
    }

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
   * Join ongoing call
   */
  const joinCall = useCallback(async (channelId, channelName) => {
    if (callState !== 'idle') {
      console.warn('[AudioCall] Cannot join call - already in call state:', callState);
      return false;
    }

    console.log('[AudioCall] Joining ongoing call in channel:', channelId);

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
   * Reject incoming call
   */
  const rejectCall = useCallback(() => {
    console.log('[AudioCall] Rejecting call');

    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
      ringtoneRef.current = null;
    }

    if (incomingCall) {
      emit('call:reject', { channelId: incomingCall.channelId });
    }

    setIncomingCall(null);
    setCallState('idle');
  }, [incomingCall, emit]);

  /**
   * Leave call (call continues for others)
   */
  const leaveCall = useCallback(() => {
    console.log('[AudioCall] Leaving call');

    const channelId = callChannelId;
    const channelName = callChannelName;

    disconnectingRef.current = true;
    cleanupCall();

    if (channelId) {
      setLastLeftChannel({ channelId, channelName });
    }

    resetLocalState();
    disconnectingRef.current = false;
  }, [callChannelId, callChannelName, cleanupCall, resetLocalState]);

  /**
   * End call for everyone
   */
  const endCall = useCallback(() => {
    console.log('[AudioCall] Ending call');

    const channelId = callChannelId;
    const channelName = callChannelName;
    const hasOthers = roomRef.current?.remoteParticipants?.size > 0;

    disconnectingRef.current = true;
    cleanupCall();

    if (channelId) {
      if (hasOthers) {
        // Others still in call - just leave
        setLastLeftChannel({ channelId, channelName });
      } else {
        // Last participant - end call
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
  }, [callChannelId, callChannelName, emit, cleanupCall, resetLocalState]);

  /**
   * Dismiss rejoin prompt
   */
  const dismissRejoin = useCallback(() => {
    setLastLeftChannel(null);
  }, []);

  /**
   * Toggle microphone mute
   */
  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    try {
      const newMuted = !isMuted;
      await room.localParticipant.setMicrophoneEnabled(!newMuted);
      setIsMuted(newMuted);
      syncParticipants();
      console.log('[AudioCall] Microphone', newMuted ? 'muted' : 'unmuted');
    } catch (error) {
      console.error('[AudioCall] Failed to toggle mute:', error);
    }
  }, [isMuted, syncParticipants]);

  /**
   * Toggle speaker mode
   */
  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => !prev);
  }, []);

  /**
   * Handle incoming call from socket
   */
  const handleIncomingCall = useCallback((data) => {
    console.log('[AudioCall] Incoming call from channel:', data.channelId);

    // Track active call
    setActiveCallChannels((prev) => ({
      ...prev,
      [data.channelId]: {
        callerName: data.callerName || 'Someone',
        callerEmpId: data.callerEmpId,
        channelName: data.channelName || '',
        startedAt: Date.now(),
      },
    }));

    // Don't show popup if already in a call
    if (callState !== 'idle') {
      console.log('[AudioCall] Already in call - not showing incoming call popup');
      return;
    }

    setCallState('ringing-in');
    setIncomingCall({
      channelId: data.channelId,
      channelName: data.channelName || '',
      callerName: data.callerName || 'Someone',
      callerEmpId: data.callerEmpId,
    });

    // Play ringtone
    ringtoneRef.current = audioCallService.createRingtone();
    ringtoneRef.current.start();

    // Auto-dismiss after 30 seconds
    ringingTimerRef.current = setTimeout(() => {
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
        ringtoneRef.current = null;
      }
      
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
   * Handle call ended from socket
   */
  const handleCallEnded = useCallback((data) => {
    console.log('[AudioCall] Call ended in channel:', data.channelId);

    // Remove from active calls
    setActiveCallChannels((prev) => {
      const next = { ...prev };
      delete next[data.channelId];
      return next;
    });

    // Clear rejoin prompt if for this channel
    setLastLeftChannel((prev) =>
      prev?.channelId === data.channelId ? null : prev
    );

    // Dismiss incoming call if for this channel
    if (incomingCall?.channelId === data.channelId && callState === 'ringing-in') {
      resetLocalState();
      return;
    }

    // End our call if we're in this channel
    if (callChannelId === data.channelId && roomRef.current) {
      if (roomRef.current.remoteParticipants.size === 0) {
        disconnectingRef.current = true;
        cleanupCall();
        resetLocalState();
        disconnectingRef.current = false;
      }
    }
  }, [incomingCall, callState, callChannelId, cleanupCall, resetLocalState]);

  // Socket event listeners
  useSocketEvent('call:start', handleIncomingCall);
  useSocketEvent('call:end', handleCallEnded);

  /**
   * Clear call error
   */
  const clearCallError = useCallback(() => {
    setCallError(null);
  }, []);

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
    lastLeftChannel,

    // Actions
    startCall,
    acceptCall,
    rejectCall,
    joinCall,
    leaveCall,
    endCall,
    dismissRejoin,
    toggleMute,
    toggleSpeaker,
    clearCallError,
  };

  return (
    <AudioCallContext.Provider value={value}>
      {children}
    </AudioCallContext.Provider>
  );
};

export const useAudioCall = () => {
  const ctx = useContext(AudioCallContext);
  if (!ctx) {
    throw new Error('useAudioCall must be used within AudioCallProvider');
  }
  return ctx;
};
