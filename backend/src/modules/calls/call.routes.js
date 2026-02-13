import { Router } from 'express';
import * as callController from './call.controller.js';
import { authenticateEmployee } from '../../middlewares/auth.middleware.js';
import { requireAdmin } from '../../middlewares/role.middleware.js';

const router = Router();

/* =====================================================
   PUBLIC ROUTES (Twilio Webhooks)
===================================================== */

// Twilio status webhook
router.post('/webhook/status', callController.handleCallStatusWebhook);

// Twilio recording webhook
router.post('/webhook/recording', callController.handleRecordingWebhook);

// TwiML endpoints
router.post('/twiml/connect', callController.getTwiMLConnect);
router.post('/twiml/voicemail', callController.getTwiMLVoicemail);

/* =====================================================
   PROTECTED ROUTES (Employee Authentication Required)
===================================================== */

// Initiate a call
router.post('/', authenticateEmployee, callController.initiateCall);

// Get my call history
router.get('/my-calls', authenticateEmployee, callController.getMyCallHistory);

// Get call history for a specific contact
router.get('/contact/:contactId', authenticateEmployee, callController.getContactCallHistory);

// Get call details by SID
router.get('/:callSid', authenticateEmployee, callController.getCallDetails);

// Cancel an ongoing call
router.post('/:callSid/cancel', authenticateEmployee, callController.cancelCall);

// Add notes to a call
router.patch('/:callLogId/notes', authenticateEmployee, callController.addCallNotes);

/* =====================================================
   ADMIN ROUTES
===================================================== */

// Get all calls with filters (admin only)
router.get('/', authenticateEmployee, requireAdmin, callController.getAllCalls);

export default router;
