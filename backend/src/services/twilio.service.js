import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken) {
  console.error('❌ Twilio credentials not configured');
  console.error('TWILIO_ACCOUNT_SID:', accountSid ? 'Set' : 'Missing');
  console.error('TWILIO_AUTH_TOKEN:', authToken ? 'Set' : 'Missing');
}

if (!twilioPhoneNumber) {
  console.error('❌ TWILIO_PHONE_NUMBER not configured');
  console.error('Please set a valid Twilio phone number in .env file');
}

// Initialize Twilio client
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Make an outbound call using click-to-call bridge pattern.
 * Twilio calls the EMPLOYEE first. When the employee picks up,
 * TwiML <Dial> bridges them to the CONTACT.
 * 
 * @param {string} employeePhone - Employee's phone number (Twilio calls this first)
 * @param {string} contactPhone - Contact's phone number (bridged via TwiML <Dial>)
 * @param {string} from - Twilio phone number (optional, uses default)
 * @returns {Promise<object>} Call object
 */
export const makeCall = async (employeePhone, contactPhone, from = twilioPhoneNumber) => {
  // Validation
  if (!client) {
    throw new Error('Twilio client not initialized. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
  }
  
  if (!from) {
    throw new Error('Twilio phone number not configured. Set TWILIO_PHONE_NUMBER in .env with your purchased Twilio number');
  }
  
  if (!employeePhone) {
    throw new Error('Employee phone number is required. Please add your phone number in profile settings.');
  }

  if (!contactPhone) {
    throw new Error('Contact phone number is required');
  }
  
  console.log('📞 Initiating bridge call:', { from, employeePhone, contactPhone });
  
  // Bridge pattern TwiML: when employee picks up, Twilio dials the contact
  const twiml = `<Response><Say voice="alice" language="en-US">Connecting you to the contact now. Please hold.</Say><Dial callerId="${from}">${contactPhone}</Dial></Response>`;
  
  try {
    const callOptions = {
      to: employeePhone,   // Call the EMPLOYEE first
      from,                // Show Twilio number as caller ID
      twiml,               // When employee answers, bridge to contact
      record: true,
    };

    // Only add webhook callbacks if APP_URL is publicly accessible (not localhost)
    const appUrl = process.env.APP_URL || '';
    if (appUrl && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')) {
      callOptions.statusCallback = `${appUrl}/api/calls/webhook/status`;
      callOptions.statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed'];
      callOptions.statusCallbackMethod = 'POST';
      callOptions.recordingStatusCallback = `${appUrl}/api/calls/webhook/recording`;
      callOptions.recordingStatusCallbackMethod = 'POST';
    }

    const call = await client.calls.create(callOptions);

    return {
      success: true,
      callSid: call.sid,
      status: call.status,
      employeePhone: call.to,
      contactPhone,
      from: call.from,
    };
  } catch (error) {
    console.error('❌ Twilio call error:', error.message);
    console.error('Error details:', {
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo
    });
    
    // Provide more specific error messages
    if (error.code === 21608) {
      throw new Error('Invalid Twilio phone number. Please purchase a valid number from Twilio Console.');
    } else if (error.code === 21211) {
      throw new Error('Invalid destination phone number format.');
    } else if (error.code === 20003) {
      throw new Error('Twilio authentication failed. Check your ACCOUNT_SID and AUTH_TOKEN.');
    }
    
    throw new Error(`Failed to initiate call: ${error.message}`);
  }
};

/**
 * Get call details from Twilio
 * @param {string} callSid - Twilio call SID
 * @returns {Promise<object>} Call details
 */
export const getCallDetails = async (callSid) => {
  try {
    const call = await client.calls(callSid).fetch();
    return {
      sid: call.sid,
      status: call.status,
      duration: call.duration,
      from: call.from,
      to: call.to,
      startTime: call.startTime,
      endTime: call.endTime,
      price: call.price,
      priceUnit: call.priceUnit,
    };
  } catch (error) {
    console.error('Error fetching call details:', error);
    throw new Error(`Failed to fetch call details: ${error.message}`);
  }
};

/**
 * Get call recording URL
 * @param {string} callSid - Twilio call SID
 * @returns {Promise<string|null>} Recording URL or null
 */
export const getCallRecording = async (callSid) => {
  try {
    const recordings = await client.recordings.list({ callSid, limit: 1 });
    if (recordings.length > 0) {
      const recordingSid = recordings[0].sid;
      return `https://api.twilio.com${recordings[0].uri.replace('.json', '.mp3')}`;
    }
    return null;
  } catch (error) {
    console.error('Error fetching recording:', error);
    return null;
  }
};

/**
 * Update call status (e.g., cancel, complete)
 * @param {string} callSid - Twilio call SID
 * @param {string} status - New status ('canceled', 'completed')
 * @returns {Promise<object>} Updated call
 */
export const updateCallStatus = async (callSid, status) => {
  try {
    const call = await client.calls(callSid).update({ status });
    return {
      success: true,
      callSid: call.sid,
      status: call.status,
    };
  } catch (error) {
    console.error('Error updating call status:', error);
    throw new Error(`Failed to update call: ${error.message}`);
  }
};

/**
 * Generate TwiML for connecting call
 * @param {string} message - Optional greeting message
 * @returns {string} TwiML XML
 */
export const generateConnectTwiML = (message = 'Connecting your call, please wait.') => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  twiml.say({ voice: 'alice', language: 'en-US' }, message);
  twiml.pause({ length: 1 });
  
  return twiml.toString();
};

/**
 * Generate TwiML for voicemail
 * @returns {string} TwiML XML
 */
export const generateVoicemailTwiML = () => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  twiml.say({ voice: 'alice', language: 'en-US' }, 
    'The person you are trying to reach is currently unavailable. Please leave a message after the beep.'
  );
  twiml.record({
    maxLength: 120,
    transcribe: true,
    transcribeCallback: `${process.env.APP_URL}/api/calls/webhook/transcription`,
  });
  twiml.say({ voice: 'alice', language: 'en-US' }, 'Thank you for your message. Goodbye.');
  
  return twiml.toString();
};

export default {
  makeCall,
  getCallDetails,
  getCallRecording,
  updateCallStatus,
  generateConnectTwiML,
  generateVoicemailTwiML,
};
