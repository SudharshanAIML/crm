import * as callRepo from './call.repo.js';
import * as twilioService from '../../services/twilio.service.js';
import * as contactRepo from '../contacts/contact.repo.js';
import * as employeeRepo from '../employees/employee.repo.js';

/**
 * Initiate a call to a contact
 */
export const initiateCall = async (contactId, employeeId, twilioPhoneNumber) => {
  // Get contact details
  const contact = await contactRepo.getContactById(contactId);
  if (!contact) {
    throw new Error('Contact not found');
  }

  if (!contact.phone) {
    throw new Error('Contact does not have a phone number');
  }

  // Get employee details to fetch their phone number
  const employee = await employeeRepo.getById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  if (!employee.phone) {
    throw new Error('Your phone number is not set. Please add your phone number in profile settings to make calls.');
  }

  // Bridge call: Twilio calls employee first, then bridges to contact
  const twilioCall = await twilioService.makeCall(
    employee.phone,      // Call the employee first
    contact.phone,       // Bridge to the contact when employee picks up
    twilioPhoneNumber || undefined
  );

  // Log the call in database
  const callLogId = await callRepo.createCallLog({
    contact_id: contactId,
    employee_id: employeeId,
    direction: 'outbound',
    call_sid: twilioCall.callSid,
    from_number: twilioCall.from,
    to_number: contact.phone,
    status: twilioCall.status,
  });

  return {
    call_log_id: callLogId,
    call_sid: twilioCall.callSid,
    status: twilioCall.status,
    contact_name: contact.name,
    contact_phone: contact.phone,
  };
};

/**
 * Handle call status webhook from Twilio
 */
export const handleCallStatusUpdate = async (callSid, statusData) => {
  const { CallStatus, CallDuration } = statusData;
  
  const updateData = {
    status: CallStatus?.toLowerCase(),
  };

  // If call is completed, add duration and end time
  if (CallStatus === 'completed' && CallDuration) {
    updateData.duration = parseInt(CallDuration);
    updateData.ended_at = new Date();
  }

  await callRepo.updateCallLogStatus(callSid, updateData);

  // Fetch recording if call completed
  if (CallStatus === 'completed') {
    setTimeout(async () => {
      try {
        const recordingUrl = await twilioService.getCallRecording(callSid);
        if (recordingUrl) {
          await callRepo.updateCallLogStatus(callSid, { recording_url: recordingUrl });
        }
      } catch (error) {
        console.error('Error fetching recording:', error);
      }
    }, 5000); // Wait 5 seconds for recording to be ready
  }

  return { success: true };
};

/**
 * Handle recording callback
 */
export const handleRecordingCallback = async (callSid, recordingData) => {
  const { RecordingUrl } = recordingData;
  
  if (RecordingUrl) {
    await callRepo.updateCallLogStatus(callSid, { 
      recording_url: RecordingUrl 
    });
  }

  return { success: true };
};

/**
 * Get call history for a contact
 */
export const getContactCallHistory = async (contactId, limit = 50, offset = 0) => {
  return await callRepo.getCallLogsByContact(contactId, limit, offset);
};

/**
 * Get call history for an employee
 */
export const getEmployeeCallHistory = async (employeeId, limit = 50, offset = 0) => {
  return await callRepo.getCallLogsByEmployee(employeeId, limit, offset);
};

/**
 * Get all calls with filters
 */
export const getAllCalls = async (filters) => {
  return await callRepo.getAllCallLogs(filters);
};

/**
 * Get call details
 */
export const getCallDetails = async (callSid) => {
  const callLog = await callRepo.getCallLogBySid(callSid);
  
  if (!callLog) {
    throw new Error('Call log not found');
  }

  // Optionally fetch live data from Twilio
  try {
    const twilioData = await twilioService.getCallDetails(callSid);
    return {
      ...callLog,
      twilio_data: twilioData,
    };
  } catch (error) {
    // If Twilio fetch fails, return database data
    return callLog;
  }
};

/**
 * Cancel an ongoing call
 */
export const cancelCall = async (callSid) => {
  // Cancel on Twilio
  await twilioService.updateCallStatus(callSid, 'canceled');
  
  // Update in database
  await callRepo.updateCallLogStatus(callSid, { 
    status: 'canceled',
    ended_at: new Date()
  });

  return { success: true, message: 'Call canceled successfully' };
};

/**
 * Add notes to a call
 */
export const addCallNotes = async (callLogId, notes) => {
  const updated = await callRepo.addCallNotes(callLogId, notes);
  if (updated === 0) {
    throw new Error('Call log not found');
  }
  return { success: true, message: 'Notes added successfully' };
};
