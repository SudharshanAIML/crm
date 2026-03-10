import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Phone, PhoneOff, X, GripHorizontal } from 'lucide-react';
import { useCall } from '../../context/CallContext';

/**
 * Persistent floating call popup — draggable, stays on screen during the entire call.
 * Mounts at the App level so it survives route navigation.
 */
const ActiveCallPopup = memo(() => {
  const { activeCall, endCall, dismissCall } = useCall();
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const popupRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  // Timer
  useEffect(() => {
    if (!activeCall?.startedAt) { setElapsed(0); return; }
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeCall.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [activeCall?.startedAt]);

  // Reset position when a new call starts
  useEffect(() => {
    if (activeCall) setPos({ x: 20, y: 20 });
  }, [activeCall?.callSid]);

  // Drag handlers
  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    const rect = popupRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 280, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  if (!activeCall) return null;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const isEnded = ['completed', 'canceled', 'failed', 'busy', 'no-answer'].includes(activeCall.status);
  const isRinging = ['initiated', 'queued', 'ringing'].includes(activeCall.status);

  const statusLabel = {
    initiated: 'Connecting…',
    queued: 'Queued…',
    ringing: 'Ringing…',
    'in-progress': 'In Call',
    completed: 'Call Ended',
    canceled: 'Cancelled',
    failed: 'Failed',
    busy: 'Busy',
    'no-answer': 'No Answer',
  }[activeCall.status] || activeCall.status;

  const statusColor = isEnded
    ? 'from-gray-600 to-gray-700'
    : isRinging
    ? 'from-amber-500 to-orange-500'
    : 'from-emerald-500 to-green-600';

  const pulseRing = isRinging ? 'animate-pulse' : '';

  return (
    <div
      ref={popupRef}
      style={{ left: pos.x, top: pos.y, zIndex: 9999, touchAction: 'none' }}
      className={`fixed select-none rounded-2xl bg-gradient-to-r ${statusColor} text-white shadow-2xl shadow-black/20 transition-shadow ${dragging ? 'shadow-3xl cursor-grabbing' : 'cursor-grab'}`}
    >
      {/* Drag handle */}
      <div
        onPointerDown={onPointerDown}
        className="flex items-center gap-2 px-4 pt-3 pb-1"
      >
        <GripHorizontal className="w-4 h-4 opacity-50" />
        <span className="text-[10px] uppercase tracking-widest opacity-60 font-semibold">Active Call</span>
        {!isEnded && (
          <button
            onClick={dismissCall}
            className="ml-auto p-1 rounded-full hover:bg-white/20 transition-colors"
            title="Minimize"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Call info */}
      <div className="px-4 pb-3 min-w-[260px]">
        <div className="flex items-center gap-3">
          {/* Animated phone icon */}
          <div className={`w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ${pulseRing}`}>
            <Phone className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{activeCall.contactName || 'Unknown'}</p>
            <p className="text-xs opacity-80">{activeCall.contactPhone || ''}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-semibold">{statusLabel}</p>
            <p className="text-sm font-mono tabular-nums">{formatTime(elapsed)}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          {!isEnded ? (
            <button
              onClick={endCall}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-semibold transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              End Call
            </button>
          ) : (
            <button
              onClick={dismissCall}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors"
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

ActiveCallPopup.displayName = 'ActiveCallPopup';
export default ActiveCallPopup;
