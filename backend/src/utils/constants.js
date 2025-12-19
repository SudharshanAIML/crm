/* ---------------------------------------------------
   CONTACT STATUSES
--------------------------------------------------- */
export const CONTACT_STATUS = {
  LEAD: "LEAD",
  MQL: "MQL",
  SQL: "SQL",
  OPPORTUNITY: "OPPORTUNITY",
  CUSTOMER: "CUSTOMER",
  EVANGELIST: "EVANGELIST",
  DORMANT: "DORMANT",
};

/* ---------------------------------------------------
   OPPORTUNITY STATUSES
--------------------------------------------------- */
export const OPPORTUNITY_STATUS = {
  OPEN: "OPEN",
  WON: "WON",
  LOST: "LOST",
};

/* ---------------------------------------------------
   SESSION STAGES
--------------------------------------------------- */
export const SESSION_STAGE = {
  MQL: "MQL",
  SQL: "SQL",
};

/* ---------------------------------------------------
   SESSION STATUS
--------------------------------------------------- */
export const SESSION_STATUS = {
  CONNECTED: "CONNECTED",
  NOT_CONNECTED: "NOT_CONNECTED",
  BAD_TIMING: "BAD_TIMING",
};

/* ---------------------------------------------------
   RATING LIMITS
--------------------------------------------------- */
export const RATING_LIMITS = {
  SESSION_MIN: 1,
  SESSION_MAX: 10,
  FEEDBACK_MIN: 1,
  FEEDBACK_MAX: 10,
};

/* ---------------------------------------------------
   BUSINESS RULE THRESHOLDS
--------------------------------------------------- */
export const THRESHOLDS = {
  MQL_TO_SQL_MIN_AVG_RATING: 7,
  EVANGELIST_MIN_AVG_FEEDBACK: 8,
  MAX_SESSIONS_PER_STAGE: 5,
};

/* ---------------------------------------------------
   USER ROLES
--------------------------------------------------- */
export const USER_ROLES = {
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
};

/* ---------------------------------------------------
   TOKEN TYPES (FUTURE USE)
--------------------------------------------------- */
export const TOKEN_TYPE = {
  ACCESS: "ACCESS",
  REFRESH: "REFRESH",
};
