import * as feedbackRepo from "./feedback.repo.js";
import * as contactRepo from "../contacts/contact.repo.js";
import {
  CONTACT_STATUS,
  RATING_LIMITS,
  THRESHOLDS,
} from "../../utils/constants.js";
import eventBus, { CRM_EVENTS } from "../../services/eventBus.service.js";

/* ---------------------------------------------------
   SUBMIT FEEDBACK
--------------------------------------------------- */
export const submitFeedback = async ({
  contactId,
  rating,
  comment,
}) => {
  // Validate rating range
  if (
    rating < RATING_LIMITS.FEEDBACK_MIN ||
    rating > RATING_LIMITS.FEEDBACK_MAX
  ) {
    throw new Error(
      `Rating must be between ${RATING_LIMITS.FEEDBACK_MIN} and ${RATING_LIMITS.FEEDBACK_MAX}`
    );
  }

  // Validate contact
  const contact = await contactRepo.getById(contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  // Only customers can give feedback
  if (contact.status !== CONTACT_STATUS.CUSTOMER) {
    throw new Error(
      "Only customers can submit feedback"
    );
  }

  // Save feedback
  await feedbackRepo.createFeedback({
    contact_id: contactId,
    rating,
    comment,
  });

  // Emit automation event
  eventBus.emitCRM(CRM_EVENTS.FEEDBACK_SUBMITTED, {
    companyId: contact.company_id,
    entityId: contactId,
    data: { contact_id: contactId, rating, comment, status: contact.status, name: contact.name, email: contact.email, assigned_emp_id: contact.assigned_emp_id },
  });

  // Check for evangelist eligibility
  await evaluateEvangelistEligibility(contactId);
};

/* ---------------------------------------------------
   GET FEEDBACK BY CONTACT
--------------------------------------------------- */
export const getFeedbackByContact = async (contactId) => {
  const contact = await contactRepo.getById(contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  return await feedbackRepo.getByContact(contactId);
};

/* ---------------------------------------------------
   GET FEEDBACK SUMMARY
--------------------------------------------------- */
export const getFeedbackSummary = async (contactId) => {
  const contact = await contactRepo.getById(contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  const avgRating =
    await feedbackRepo.getAverageRating(contactId);

  const count =
    await feedbackRepo.getFeedbackCount(contactId);

  return {
    contactId,
    averageRating: avgRating,
    feedbackCount: count,
  };
};

/* ---------------------------------------------------
   INTERNAL: EVALUATE EVANGELIST ELIGIBILITY
--------------------------------------------------- */
const evaluateEvangelistEligibility = async (contactId) => {
  const avgRating =
    await feedbackRepo.getAverageRating(contactId);

  if (
    avgRating >= THRESHOLDS.EVANGELIST_MIN_AVG_FEEDBACK
  ) {
    await contactRepo.updateStatus(
      contactId,
      CONTACT_STATUS.EVANGELIST
    );

    await contactRepo.insertStatusHistory(
      contactId,
      CONTACT_STATUS.CUSTOMER,
      CONTACT_STATUS.EVANGELIST,
      null // system-driven
    );
  }
};
