import crypto from "crypto";
import * as contactRepo from "./contact.repo.js";
import * as sessionRepo from "../sessions/session.repo.js";
import * as opportunityRepo from "../opportunities/opportunity.repo.js";
import * as dealRepo from "../deals/deal.repo.js";
import * as feedbackRepo from "../feedback/feedback.repo.js";
import { sendLeadEmail } from "../emails/email.service.js";

/* ---------------------------------------------------
   HELPER: UPDATE CONTACT TEMPERATURE BASED ON RATING
--------------------------------------------------- */
const updateContactTemperature = async (contactId) => {
  const avgRating = await sessionRepo.getOverallAverageRating(contactId);
  
  let temperature = 'COLD';
  if (avgRating >= 8) {
    temperature = 'HOT';
  } else if (avgRating >= 6) {
    temperature = 'WARM';
  }
  
  await contactRepo.updateTemperature(contactId, temperature);
  return temperature;
};

/* ---------------------------------------------------
   CREATE LEAD (Employee)
--------------------------------------------------- */
export const createLead = async (data) => {
  const contactId = await contactRepo.createContact({
    ...data,
    status: "LEAD",
  });

  // Generate tracking token
  const token = crypto.randomUUID();
  await contactRepo.saveTrackingToken(contactId, token);

  // Send personalized email
  await sendLeadEmail({
    contactId,
    name: data.name,
    email: data.email,
    token,
  });

  return contactId;
};

/* ---------------------------------------------------
   GET CONTACT
--------------------------------------------------- */
export const getContactById = async (id) => {
  return await contactRepo.getById(id);
};

/* ---------------------------------------------------
   UPDATE CONTACT
--------------------------------------------------- */
export const updateContact = async (contactId, updates) => {
  return await contactRepo.updateContact(contactId, updates);
};

/* ---------------------------------------------------
   CREATE SESSION AND UPDATE TEMPERATURE
--------------------------------------------------- */
export const createSessionAndUpdateTemperature = async (sessionData) => {
  // Create the session
  const sessionId = await sessionRepo.createSession(sessionData);
  
  // Update contact temperature based on new average rating
  await updateContactTemperature(sessionData.contact_id);
  
  return sessionId;
};

/* ---------------------------------------------------
   GET CONTACTS BY STATUS
--------------------------------------------------- */
export const getContactsByStatus = async (companyId, status, limit = 50, offset = 0) => {
  if (status) {
    return await contactRepo.getByStatus(status, companyId);
  }
  return await contactRepo.getAll(companyId, limit, offset);
};

/* ---------------------------------------------------
   SYSTEM: LEAD → MQL (Marketing Automation)
--------------------------------------------------- */
export const processLeadActivity = async ({ contactId, token }) => {
  const contact = await contactRepo.getById(contactId);
  if (!contact) return;

  // Security check
  if (contact.tracking_token !== token) return;

  // Increase interest score
  await contactRepo.incrementInterestScore(contactId);

  // Auto promote
  if (contact.status === "LEAD") {
    await contactRepo.updateStatus(contactId, "MQL");
    await contactRepo.insertStatusHistory(
      contactId,
      "LEAD",
      "MQL",
      null // system
    );
  }
};

/* ---------------------------------------------------
   EMPLOYEE: LEAD → MQL (Manual Promotion)
--------------------------------------------------- */
export const promoteToMQL = async (contactId, empId) => {
  const contact = await contactRepo.getById(contactId);

  if (!contact) {
    throw new Error("Contact not found");
  }

  if (contact.status !== "LEAD") {
    throw new Error("Only LEAD can be promoted to MQL");
  }

  await contactRepo.updateStatus(contactId, "MQL");
  await contactRepo.insertStatusHistory(
    contactId,
    "LEAD",
    "MQL",
    empId
  );
};

/* ---------------------------------------------------
   EMPLOYEE: MQL → SQL
--------------------------------------------------- */
export const promoteToSQL = async (contactId, empId) => {
  const contact = await contactRepo.getById(contactId);

  if (!contact || contact.status !== "MQL") {
    throw new Error("Only MQL can be promoted to SQL");
  }

  const avgRating = await sessionRepo.getAverageRating(
    contactId,
    "MQL"
  );

  if (avgRating < 7) {
    throw new Error("MQL not qualified for SQL -lead should have avgRating >=7 ");
  }

  await contactRepo.updateStatus(contactId, "SQL");
  await contactRepo.insertStatusHistory(
    contactId,
    "MQL",
    "SQL",
    empId
  );
};

/* ---------------------------------------------------
   EMPLOYEE: SQL → OPPORTUNITY
--------------------------------------------------- */
export const convertToOpportunity = async (
  contactId,
  empId,
  expectedValue
) => {
  const contact = await contactRepo.getById(contactId);

  if (!contact || contact.status !== "SQL") {
    throw new Error("Only SQL can be converted to Opportunity");
  }

  await opportunityRepo.createOpportunity({
    contact_id: contactId,
    emp_id: empId,
    expected_value: expectedValue,
  });

  await contactRepo.updateStatus(contactId, "OPPORTUNITY");
  await contactRepo.insertStatusHistory(
    contactId,
    "SQL",
    "OPPORTUNITY",
    empId
  );
};

/* ---------------------------------------------------
   SYSTEM: OPPORTUNITY → CUSTOMER (Deal Closed)
--------------------------------------------------- */
export const closeDeal = async (contactId, empId, dealValue) => {
  // Find the open opportunity for this contact
  const opportunity = await opportunityRepo.getOpenByContact(contactId);

  if (!opportunity || opportunity.status !== "OPEN") {
    throw new Error("No open opportunity found for this contact");
  }

  await dealRepo.createDeal({
    opportunity_id: opportunity.opportunity_id,
    deal_value: dealValue,
    closed_by: empId,
  });

  await opportunityRepo.markWon(opportunity.opportunity_id);

  await contactRepo.updateStatus(
    contactId,
    "CUSTOMER"
  );

  await contactRepo.insertStatusHistory(
    contactId,
    "OPPORTUNITY",
    "CUSTOMER",
    empId
  );
};

/* ---------------------------------------------------
   SYSTEM: CUSTOMER → EVANGELIST
--------------------------------------------------- */
export const convertToEvangelist = async (contactId) => {
  const contact = await contactRepo.getById(contactId);

  if (!contact || contact.status !== "CUSTOMER") {
    throw new Error("Only customers can become evangelists");
  }

  const avgFeedback =
    await feedbackRepo.getAverageRating(contactId);

  if (avgFeedback < 8) {
    throw new Error("Customer not eligible for evangelist");
  }

  await contactRepo.updateStatus(contactId, "EVANGELIST");
  await contactRepo.insertStatusHistory(
    contactId,
    "CUSTOMER",
    "EVANGELIST",
    null // system
  );
};
