import * as sessionService from "./session.service.js";

/**
 * @desc   Create a new session
 * @route  POST /sessions
 * @access Employee
 */
export const createSession = async (req, res, next) => {
  try {
    const { contact_id, stage, rating, session_status, mode_of_contact, remarks } =
      req.body;

    if (!contact_id || !session_status) {
      return res.status(400).json({
        message: "contact_id and session_status are required",
      });
    }

    const result = await sessionService.createSession({
      contactId: contact_id,
      empId: req.user.empId,
      stage,
      rating,
      sessionStatus: session_status,
      modeOfContact: mode_of_contact,
      feedback: remarks,
    });

    res.status(201).json({
      message: "Session created successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all sessions for a contact
 * @route  GET /sessions/contact/:contactId
 * @access Employee
 */
export const getSessionsByContact = async (req, res, next) => {
  try {
    const result = await sessionService.getSessionsByContact(
      req.params.contactId
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get sessions for a contact by stage (MQL / SQL)
 * @route  GET /sessions/contact/:contactId/:stage
 * @access Employee
 */
export const getSessionsByStage = async (req, res, next) => {
  try {
    const { contactId, stage } = req.params;

    const sessions = await sessionService.getSessionsByStage(contactId, stage);

    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update a session (rating / status / feedback)
 * @route  PATCH /sessions/:id
 * @access Employee
 */
export const updateSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;

    const result = await sessionService.updateSession(sessionId, req.body);

    res.json({
      message: "Session updated successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete a session
 * @route  DELETE /sessions/:id
 * @access Employee / Admin
 */
export const deleteSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;

    await sessionService.deleteSession(sessionId);

    res.json({
      message: "Session deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all sessions by stage (company-wide)
 * @route  GET /sessions/stage/:stage
 * @access Employee
 */
export const getAllSessionsByStage = async (req, res, next) => {
  try {
    const { stage } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    const DEFAULT_COMPANY_ID = 1;
    const companyId = req.user?.companyId || DEFAULT_COMPANY_ID;

    const result = await sessionService.getAllSessionsByStage(
      companyId,
      stage,
      parseInt(limit),
      parseInt(offset)
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};