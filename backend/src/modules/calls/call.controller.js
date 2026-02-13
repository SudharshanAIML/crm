import * as callService from './call.service.js';
import * as twilioService from '../../services/twilio.service.js';

/**
 * @desc   Initiate a call to a contact
 * @route  POST /api/calls
 * @access Employee
 */
export const initiateCall = async (req, res, next) => {
  try {
    const { contact_id, twilio_phone_number } = req.body;
    const employeeId = req.user?.empId;

    if (!contact_id) {
      return res.status(400).json({ message: 'Contact ID is required' });
    }

    if (!employeeId) {
      return res.status(401).json({ message: 'Employee authentication required' });
    }

    const result = await callService.initiateCall(
      contact_id, 
      employeeId, 
      twilio_phone_number
    );

    res.status(200).json({
      message: 'Call initiated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Call initiation error:', error.message);
    
    // Send user-friendly error messages
    res.status(400).json({ 
      message: error.message || 'Failed to initiate call. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc   Get call history for a contact
 * @route  GET /api/calls/contact/:contactId
 * @access Employee
 */
export const getContactCallHistory = async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const calls = await callService.getContactCallHistory(
      contactId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json(calls);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get call history for logged-in employee
 * @route  GET /api/calls/my-calls
 * @access Employee
 */
export const getMyCallHistory = async (req, res, next) => {
  try {
    const employeeId = req.user?.empId;
    const { limit = 50, offset = 0 } = req.query;

    if (!employeeId) {
      return res.status(401).json({ message: 'Employee authentication required' });
    }

    const calls = await callService.getEmployeeCallHistory(
      employeeId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json(calls);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all calls with filters (Admin only)
 * @route  GET /api/calls
 * @access Admin
 */
export const getAllCalls = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      employee_id: req.query.employee_id,
      contact_id: req.query.contact_id,
      direction: req.query.direction,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0,
    };

    const calls = await callService.getAllCalls(filters);
    res.json(calls);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get call details by SID
 * @route  GET /api/calls/:callSid
 * @access Employee
 */
export const getCallDetails = async (req, res, next) => {
  try {
    const { callSid } = req.params;
    const call = await callService.getCallDetails(callSid);

    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    res.json(call);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Cancel an ongoing call
 * @route  POST /api/calls/:callSid/cancel
 * @access Employee
 */
export const cancelCall = async (req, res, next) => {
  try {
    const { callSid } = req.params;
    const result = await callService.cancelCall(callSid);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Add notes to a call
 * @route  PATCH /api/calls/:callLogId/notes
 * @access Employee
 */
export const addCallNotes = async (req, res, next) => {
  try {
    const { callLogId } = req.params;
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({ message: 'Notes are required' });
    }

    const result = await callService.addCallNotes(callLogId, notes);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/* =====================================================
   TWILIO WEBHOOK HANDLERS
===================================================== */

/**
 * @desc   Handle Twilio call status updates
 * @route  POST /api/calls/webhook/status
 * @access Public (Twilio webhook)
 */
export const handleCallStatusWebhook = async (req, res, next) => {
  try {
    const { CallSid } = req.body;
    
    if (!CallSid) {
      return res.status(400).send('Missing CallSid');
    }

    await callService.handleCallStatusUpdate(CallSid, req.body);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
};

/**
 * @desc   Handle Twilio recording callback
 * @route  POST /api/calls/webhook/recording
 * @access Public (Twilio webhook)
 */
export const handleRecordingWebhook = async (req, res, next) => {
  try {
    const { CallSid } = req.body;
    
    if (!CallSid) {
      return res.status(400).send('Missing CallSid');
    }

    await callService.handleRecordingCallback(CallSid, req.body);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Recording webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
};

/**
 * @desc   TwiML endpoint for connecting calls
 * @route  POST /api/calls/twiml/connect
 * @access Public (Twilio webhook)
 */
export const getTwiMLConnect = async (req, res) => {
  try {
    const twiml = twilioService.generateConnectTwiML(
      'Hello! Connecting you to your contact now.'
    );
    
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('TwiML generation error:', error);
    res.status(500).send('TwiML generation failed');
  }
};

/**
 * @desc   TwiML endpoint for voicemail
 * @route  POST /api/calls/twiml/voicemail
 * @access Public (Twilio webhook)
 */
export const getTwiMLVoicemail = async (req, res) => {
  try {
    const twiml = twilioService.generateVoicemailTwiML();
    
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('TwiML generation error:', error);
    res.status(500).send('TwiML generation failed');
  }
};
