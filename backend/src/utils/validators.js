import {
  CONTACT_STATUS,
  OPPORTUNITY_STATUS,
  SESSION_STAGE,
  SESSION_STATUS,
  RATING_LIMITS,
} from "./constants.js";

/* ---------------------------------------------------
   GENERIC HELPERS
--------------------------------------------------- */

export const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  value === "";

export const isNumber = (value) =>
  typeof value === "number" && !isNaN(value);

/* ---------------------------------------------------
   CONTACT VALIDATORS
--------------------------------------------------- */

export const validateContactStatus = (status) => {
  if (!Object.values(CONTACT_STATUS).includes(status)) {
    throw new Error("Invalid contact status");
  }
};

export const validateContactCreate = (data) => {
  if (isEmpty(data.company_id)) {
    throw new Error("company_id is required");
  }
  if (isEmpty(data.name)) {
    throw new Error("name is required");
  }
  if (isEmpty(data.email)) {
    throw new Error("email is required");
  }
};

/* ---------------------------------------------------
   SESSION VALIDATORS
--------------------------------------------------- */

export const validateSessionStage = (stage) => {
  if (!Object.values(SESSION_STAGE).includes(stage)) {
    throw new Error("Invalid session stage");
  }
};

export const validateSessionStatus = (status) => {
  if (!Object.values(SESSION_STATUS).includes(status)) {
    throw new Error("Invalid session status");
  }
};

export const validateSessionRating = (rating) => {
  if (
    rating !== undefined &&
    (!isNumber(rating) ||
      rating < RATING_LIMITS.SESSION_MIN ||
      rating > RATING_LIMITS.SESSION_MAX)
  ) {
    throw new Error(
      `Session rating must be between ${RATING_LIMITS.SESSION_MIN} and ${RATING_LIMITS.SESSION_MAX}`
    );
  }
};

/* ---------------------------------------------------
   OPPORTUNITY VALIDATORS
--------------------------------------------------- */

export const validateOpportunityStatus = (status) => {
  if (!Object.values(OPPORTUNITY_STATUS).includes(status)) {
    throw new Error("Invalid opportunity status");
  }
};

export const validateExpectedValue = (value) => {
  if (!isNumber(value) || value <= 0) {
    throw new Error("expectedValue must be a positive number");
  }
};

/* ---------------------------------------------------
   DEAL VALIDATORS
--------------------------------------------------- */

export const validateDealValue = (value) => {
  if (!isNumber(value) || value <= 0) {
    throw new Error("dealValue must be a positive number");
  }
};

/* ---------------------------------------------------
   FEEDBACK VALIDATORS
--------------------------------------------------- */

export const validateFeedbackRating = (rating) => {
  if (
    !isNumber(rating) ||
    rating < RATING_LIMITS.FEEDBACK_MIN ||
    rating > RATING_LIMITS.FEEDBACK_MAX
  ) {
    throw new Error(
      `Feedback rating must be between ${RATING_LIMITS.FEEDBACK_MIN} and ${RATING_LIMITS.FEEDBACK_MAX}`
    );
  }
};
