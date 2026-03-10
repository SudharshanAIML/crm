import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { initiateCall as apiInitiateCall, cancelCall as apiCancelCall, getCallDetails } from '../services/callService';

const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
  const [activeCall, setActiveCall] = useState(null);
  // activeCall shape: { callSid, callLogId, contactName, contactPhone, status, startedAt }

  const pollRef = useRef(null);

  const startCall = useCallback(async (contactId, contactName, contactPhone) => {
    const result = await apiInitiateCall(contactId);
    const call = {
      callSid: result.data.call_sid,
      callLogId: result.data.call_log_id,
      contactName: contactName || result.data.contact_name,
      contactPhone: contactPhone || result.data.contact_phone,
      status: result.data.status || 'initiated',
      startedAt: Date.now(),
    };
    setActiveCall(call);
    return call;
  }, []);

  const endCall = useCallback(async () => {
    if (activeCall?.callSid) {
      try {
        await apiCancelCall(activeCall.callSid);
      } catch {
        // call may already be ended
      }
    }
    setActiveCall(null);
  }, [activeCall]);

  const dismissCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  // Poll call status while active
  useEffect(() => {
    if (!activeCall?.callSid) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const poll = async () => {
      try {
        const details = await getCallDetails(activeCall.callSid);
        const status = details?.status || details?.call?.status;
        if (status) {
          setActiveCall(prev => prev ? { ...prev, status } : null);
          if (['completed', 'canceled', 'failed', 'busy', 'no-answer'].includes(status)) {
            // Auto-dismiss after 3 seconds when call ends
            setTimeout(() => setActiveCall(null), 3000);
            clearInterval(pollRef.current);
          }
        }
      } catch {
        // ignore poll errors
      }
    };

    pollRef.current = setInterval(poll, 4000);
    return () => clearInterval(pollRef.current);
  }, [activeCall?.callSid]);

  return (
    <CallContext.Provider value={{ activeCall, startCall, endCall, dismissCall }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
};
