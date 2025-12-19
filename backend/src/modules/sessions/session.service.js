import * as sessionRepo from "./session.repo.js";
import * as contactRepo from "../contacts/contact.repo.js";

/* ---------------------------------------------------
   CREATE SESSION (MQL / SQL)
--------------------------------------------------- */
export const createSession = async ({
  contactId,
  empId,
  stage,
  sessionNo,
  rating,
  sessionStatus,
  remarks,
}) => {
  // Validate stage
  if (!["MQL", "SQL"].includes(stage)) {
    throw new Error("Invalid session stage");
  }

  // Validate session status
  if (!["CONNECTED", "NOT_CONNECTED", "BAD_TIMING"].includes(sessionStatus)) {
    throw new Error("Invalid session status");
  }

  // Validate rating if provided
  if (rating !== undefined && (rating < 1 || rating > 10)) {
    throw new Error("Rating must be between 1 and 10");
  }

  // Validate contact exists
  const contact = await contactRepo.getById(contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  // Ensure correct stage vs contact status
  if (stage === "MQL" && contact.status !== "MQL") {
    throw new Error("Contact is not in MQL stage");
  }

  if (stage === "SQL" && contact.status !== "SQL") {
    throw new Error("Contact is not in SQL stage");
  }

  // Enforce max 5 sessions per stage
  const count = await sessionRepo.countByStage(contactId, stage);
  if (count >= 5) {
    throw new Error(`Maximum ${stage} sessions reached`);
  }

  // Insert session
  await sessionRepo.createSession({
    contact_id: contactId,
    emp_id: empId,
    stage,
    session_no: sessionNo,
    rating,
    session_status: sessionStatus,
    remarks,
  });
};

/* ---------------------------------------------------
   GET ALL SESSIONS FOR A CONTACT
--------------------------------------------------- */
export const getSessionsByContact = async (contactId) => {
  const contact = await contactRepo.getById(contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  return await sessionRepo.getByContact(contactId);
};

/* ---------------------------------------------------
   GET SESSIONS BY STAGE
--------------------------------------------------- */
export const getSessionsByStage = async (contactId, stage) => {
  if (!["MQL", "SQL"].includes(stage)) {
    throw new Error("Invalid stage");
  }

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
    (updates.rating < 1 || updates.rating > 10)
  ) {
    throw new Error("Rating must be between 1 and 10");
  }

  if (
    updates.session_status &&
    !["CONNECTED", "NOT_CONNECTED", "BAD_TIMING"].includes(
      updates.session_status
    )
  ) {
    throw new Error("Invalid session status");
  }

  await sessionRepo.updateSession(sessionId, updates);
};

/* ---------------------------------------------------
   DELETE SESSION
--------------------------------------------------- */
export const deleteSession = async (sessionId) => {
  const session = await sessionRepo.getById(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  await sessionRepo.deleteSession(sessionId);
};

/* ---------------------------------------------------
   ANALYTICS HELPERS (USED BY CONTACT SERVICE)
--------------------------------------------------- */
export const getAverageRating = async (contactId, stage) => {
  return await sessionRepo.getAverageRating(contactId, stage);
};
