/**
 * Audio Call Service
 * 
 * Centralized service for managing audio call operations with LiveKit.
 * Handles token fetching, call logs, and participant management.
 */

import api from './api';

/* =====================================================
   TOKEN MANAGEMENT
===================================================== */

/**
 * Get a LiveKit access token to join an audio call room
 * @param {number} channelId - The channel ID to join
 * @returns {Promise<{ token: string, wsUrl: string, roomName: string }>}
 */
export const getCallToken = async (channelId) => {
  try {
    const { data } = await api.post(`/discuss/channels/${channelId}/call/token`);
    return data;
  } catch (error) {
    console.error('[AudioCallService] Failed to get call token:', error);
    throw new Error(
      error?.response?.data?.message || 
      'Failed to get call token. Please check your connection.'
    );
  }
};

/* =====================================================
   CALL LOGS
===================================================== */

/**
 * Fetch call history for a specific channel
 * @param {number} channelId - The channel ID
 * @returns {Promise<Array>} Array of call log objects
 */
export const getCallLogs = async (channelId) => {
  try {
    const { data } = await api.get(`/discuss/channels/${channelId}/call/logs`);
    return data;
  } catch (error) {
    console.error('[AudioCallService] Failed to fetch call logs:', error);
    return [];
  }
};

/**
 * Get current participants in an active call
 * @param {number} channelId - The channel ID
 * @returns {Promise<Array>} Array of participant objects
 */
export const getCallParticipants = async (channelId) => {
  try {
    const { data } = await api.get(`/discuss/channels/${channelId}/call/participants`);
    return data;
  } catch (error) {
    console.error('[AudioCallService] Failed to fetch call participants:', error);
    return [];
  }
};

/* =====================================================
   MICROPHONE PERMISSION
===================================================== */

/**
 * Request microphone permission from the browser
 * @returns {Promise<boolean>} True if permission granted
 */
export const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop tracks immediately - we just needed the permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.warn('[AudioCallService] Microphone permission denied:', error);
    return false;
  }
};

/**
 * Check if microphone permission is already granted
 * @returns {Promise<boolean>}
 */
export const checkMicrophonePermission = async () => {
  try {
    if (!navigator.permissions) return false;
    const result = await navigator.permissions.query({ name: 'microphone' });
    return result.state === 'granted';
  } catch (error) {
    // Fallback: try to get user media
    return requestMicrophonePermission();
  }
};

/* =====================================================
   AUDIO UTILITIES
===================================================== */

/**
 * Create a ringtone generator using Web Audio API
 * @returns {{ start: Function, stop: Function }}
 */
export const createRingtone = () => {
  let audioContext = null;
  let intervalId = null;

  const playTone = () => {
    if (!audioContext) return;

    try {
      // First tone (440 Hz)
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      
      oscillator1.frequency.value = 440;
      gainNode1.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
      
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.4);

      // Second tone (523 Hz) - delayed for ring-ring pattern
      setTimeout(() => {
        if (!audioContext) return;
        
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.frequency.value = 523;
        gainNode2.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.3);
      }, 200);
    } catch (error) {
      console.warn('[AudioCallService] Failed to play tone:', error);
    }
  };

  return {
    start() {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        playTone();
        intervalId = setInterval(playTone, 2500);
      } catch (error) {
        console.warn('[AudioCallService] Web Audio API unavailable:', error);
      }
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
      }
    }
  };
};

/**
 * Format seconds into MM:SS format
 * @param {number} seconds
 * @returns {string}
 */
export const formatCallDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/* =====================================================
   AUDIO ELEMENT MANAGEMENT
===================================================== */

/**
 * Get or create the container for LiveKit audio elements
 * @returns {HTMLElement}
 */
export const getAudioContainer = () => {
  let container = document.getElementById('livekit-audio-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'livekit-audio-container';
    // Position off-screen but not display:none to avoid browser throttling
    container.style.cssText = `
      position: fixed;
      width: 1px;
      height: 1px;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      left: -9999px;
      top: -9999px;
    `;
    document.body.appendChild(container);
  }
  
  return container;
};

/**
 * Clear all audio elements from the container
 */
export const clearAudioElements = () => {
  const container = document.getElementById('livekit-audio-container');
  if (container) {
    container.innerHTML = '';
  }
};

/**
 * Attach an audio track to the DOM for playback
 * @param {Track} track - LiveKit audio track
 * @returns {HTMLAudioElement}
 */
export const attachAudioTrack = (track) => {
  const audioElement = track.attach();
  audioElement.autoplay = true;
  audioElement.volume = 1.0;
  audioElement.dataset.livekitTrack = track.sid;
  
  const container = getAudioContainer();
  container.appendChild(audioElement);
  
  // Attempt to play, with fallback for autoplay restrictions
  audioElement.play()
    .then(() => {
      console.debug('[AudioCallService] Audio playing for track:', track.sid);
    })
    .catch((error) => {
      console.warn('[AudioCallService] Autoplay blocked, waiting for user interaction:', error.message);
      
      // Retry on next user interaction
      const resumePlay = () => {
        audioElement.play().catch(() => {});
        document.removeEventListener('click', resumePlay);
        document.removeEventListener('touchstart', resumePlay);
      };
      
      document.addEventListener('click', resumePlay, { once: true });
      document.addEventListener('touchstart', resumePlay, { once: true });
    });
  
  return audioElement;
};

/**
 * Detach and remove audio elements for a track
 * @param {Track} track - LiveKit audio track
 */
export const detachAudioTrack = (track) => {
  const elements = track.detach();
  elements.forEach(element => element.remove());
};

/* =====================================================
   VALIDATION
===================================================== */

/**
 * Validate LiveKit configuration
 * @returns {boolean}
 */
export const isLiveKitConfigured = () => {
  const wsUrl = import.meta.env.VITE_LIVEKIT_URL;
  return !!wsUrl && wsUrl.startsWith('wss://');
};

/**
 * Check if browser supports required features
 * @returns {{ supported: boolean, missing: string[] }}
 */
export const checkBrowserSupport = () => {
  const missing = [];
  
  if (!navigator.mediaDevices?.getUserMedia) {
    missing.push('getUserMedia');
  }
  
  if (!window.AudioContext && !window.webkitAudioContext) {
    missing.push('Web Audio API');
  }
  
  if (!window.RTCPeerConnection) {
    missing.push('WebRTC');
  }
  
  return {
    supported: missing.length === 0,
    missing
  };
};

export default {
  getCallToken,
  getCallLogs,
  getCallParticipants,
  requestMicrophonePermission,
  checkMicrophonePermission,
  createRingtone,
  formatCallDuration,
  getAudioContainer,
  clearAudioElements,
  attachAudioTrack,
  detachAudioTrack,
  isLiveKitConfigured,
  checkBrowserSupport
};


/* =====================================================
   CALL STATE CONSTANTS
===================================================== */

export const CallState = {
  IDLE: 'idle',
  RINGING_OUT: 'ringing-out',
  RINGING_IN: 'ringing-in',
  CONNECTING: 'connecting',
  ACTIVE: 'active',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed'
};

export const CallErrorType = {
  PERMISSION_DENIED: 'permission_denied',
  TOKEN_FAILED: 'token_failed',
  CONNECTION_FAILED: 'connection_failed',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
};

/**
 * Get user-friendly error message
 * @param {string} errorType
 * @returns {string}
 */
export const getErrorMessage = (errorType) => {
  const messages = {
    [CallErrorType.PERMISSION_DENIED]: 'Microphone access denied. Please allow microphone permission in your browser settings.',
    [CallErrorType.TOKEN_FAILED]: 'Failed to authenticate call. Please try again.',
    [CallErrorType.CONNECTION_FAILED]: 'Failed to connect to call server. Check your internet connection.',
    [CallErrorType.NETWORK_ERROR]: 'Network error occurred. Please check your connection.',
    [CallErrorType.TIMEOUT]: 'Call connection timed out. Please try again.',
    [CallErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.'
  };
  
  return messages[errorType] || messages[CallErrorType.UNKNOWN];
};
