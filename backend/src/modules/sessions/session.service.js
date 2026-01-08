import * as sessionRepo from "./session.repo.js";
import * as contactRepo from "../contacts/contact.repo.js";

/* ---------------------------------------------------
   HELPER: Calculate temperature based on average rating
--------------------------------------------------- */
const calculateTemperature = (avgRating) => {
  if (avgRating >= 8) return "HOT";
  if (avgRating >= 6) return "WARM";
  return "COLD";
};

/* ---------------------------------------------------
   HELPER: Update contact temperature based on sessions
--------------------------------------------------- */
const updateContactTemperature = async (contactId) => {
  // Get overall average rating for all sessions
  const avgRating = await sessionRepo.getOverallAverageRating(contactId);

  if (avgRating > 0) {
    const newTemperature = calculateTemperature(avgRating);
    await contactRepo.updateTemperature(contactId, newTemperature);
    return { avgRating, newTemperature };
  }

  return { avgRating: 0, newTemperature: null };
};

/* ---------------------------------------------------
   CREATE SESSION (No limit, any stage)
--------------------------------------------------- */
export const createSession = async ({
  contactId,
  empId,
  stage,
  rating,
  sessionStatus,
  modeOfContact,
  feedback,
}) => {
  // Validate session status
  if (!["CONNECTED", "NOT_CONNECTED", "BAD_TIMING"].includes(sessionStatus)) {
    throw new Error("Invalid session status");
  }

  // Validate mode of contact
  const validModes = ["CALL", "EMAIL", "MEETING", "DEMO", "NOTE"];
  if (modeOfContact && !validModes.includes(modeOfContact)) {
    throw new Error("Invalid mode of contact");
  }

  // Validate rating if provided
  if (rating !== undefined && rating !== null && (rating < 1 || rating > 10)) {
    throw new Error("Rating must be between 1 and 10");
  }

  // Validate contact exists
  const contact = await contactRepo.getById(contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  // Use the contact's current status as the session stage
  // This captures the exact stage the contact was in when the session was logged
  const sessionStage = stage || contact.status;

  // Insert session
  const sessionId = await sessionRepo.createSession({
    contact_id: contactId,
    emp_id: empId,
    stage: sessionStage,
    rating,
    session_status: sessionStatus,
    mode_of_contact: modeOfContact || "CALL",
    remarks: feedback,
  });

  // Auto-update contact temperature based on new average
  const temperatureUpdate = await updateContactTemperature(contactId);

  return {
    sessionId,
    ...temperatureUpdate,
  };
};

/* ---------------------------------------------------
   GET ALL SESSIONS FOR A CONTACT
--------------------------------------------------- */
export const getSessionsByContact = async (contactId) => {
  const contact = await contactRepo.getById(contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  const sessions = await sessionRepo.getByContact(contactId);
  const avgRating = await sessionRepo.getOverallAverageRating(contactId);

  return {
    sessions,
    averageRating: avgRating,
    sessionCount: sessions.length,
  };
};

/* ---------------------------------------------------
   GET SESSIONS BY STAGE
--------------------------------------------------- */
export const getSessionsByStage = async (contactId, stage) => {
  return await sessionRepo.getByStage(contactId, stage);
};

/* ---------------------------------------------------
   UPDATE SESSION
--------------------------------------------------- */
export const updateSession = async (sessionId, updates) => {
  const session = await sessionRepo.getById(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  if (
    updates.rating !== undefined &&
    updates.rating !== null &&
    (updates.rating < 1 || updates.rating > 10)
  ) {
    throw new Error("Rating must be between 1 and 10");
  }

  if (
    updates.session_status &&
    !["CONNECTED", "NOT_CONNECTED", "BAD_TIMING"].includes(updates.session_status)
  ) {
    throw new Error("Invalid session status");
  }

  if (
    updates.mode_of_contact &&
    !["CALL", "EMAIL", "MEETING", "DEMO", "NOTE"].includes(updates.mode_of_contact)
  ) {
    throw new Error("Invalid mode of contact");
  }

  await sessionRepo.updateSession(sessionId, updates);

  // Update contact temperature after session update
  const temperatureUpdate = await updateContactTemperature(session.contact_id);

  return temperatureUpdate;
};

/* ---------------------------------------------------
   DELETE SESSION
--------------------------------------------------- */
export const deleteSession = async (sessionId) => {
  const session = await sessionRepo.getById(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const contactId = session.contact_id;
  await sessionRepo.deleteSession(sessionId);

  // Update contact temperature after session deletion
  await updateContactTemperature(contactId);
};

/* ---------------------------------------------------
   ANALYTICS HELPERS (USED BY CONTACT SERVICE)
--------------------------------------------------- */
export const getAverageRating = async (contactId, stage) => {
  return await sessionRepo.getAverageRating(contactId, stage);
};

export const getOverallAverageRating = async (contactId) => {
  return await sessionRepo.getOverallAverageRating(contactId);
};

/* ---------------------------------------------------
   GET ALL SESSIONS BY STAGE (COMPANY-WIDE)
--------------------------------------------------- */
export const getAllSessionsByStage = async (companyId, stage, limit = 100, offset = 0) => {
  // Validate stage
  const validStages = ['LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST'];
  if (!validStages.includes(stage?.toUpperCase())) {
    throw new Error('Invalid stage');
  }
  
  const sessions = await sessionRepo.getAllByStage(companyId, stage.toUpperCase(), limit, offset);
  const total = await sessionRepo.countAllByStage(companyId, stage.toUpperCase());
  
  return {
    sessions,
    total,
    limit,
    offset
  };
};